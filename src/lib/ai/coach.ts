import "server-only";

import type { ModelMessage } from "ai";
import { after } from "next/server";

import { userModelRef, type ModelRef } from "@/lib/ai/aiCredentials";
import { toolsRouting } from "@/lib/ai/capabilities";
import {
  aiErrorReply,
  buildContext,
  deterministicReply,
  limitErrorReply,
} from "@/lib/ai/coachContext";
import { buildCoachTools, previewApproval } from "@/lib/ai/coachTools";
import {
  COACH_FRAME,
  coachingRules,
  diningRule,
  NO_WRITE_ADDENDUM,
  SUGGESTION_ADDENDUM,
  summaryRules,
  TOOLS_ADDENDUM,
  WRITE_TOOLS_ADDENDUM,
} from "@/lib/ai/coachPrompt";
import {
  chat,
  chatToolsStream,
  type CoachEvent,
} from "@/lib/ai/provider";
import {
  COACH_MAX_TURNS_PER_HOUR,
  COACH_TURN_WINDOW_MS,
} from "@/lib/ai/limits";
import { learnFromExchange, retrieveFacts } from "@/lib/ai/facts";
import { getCoachMemory, refreshCoachMemory } from "@/lib/ai/memory";
import { canWriteMeals } from "@/lib/ai/writeGate";
import { listActiveRules } from "@/lib/data/coachRules";
import {
  beginExchange,
  discardExchange,
  finishExchange,
  getConversation,
  getExchangeStatus,
  recentTurnCount,
  updateExchangeContent,
  type CoachMessage,
  type ExchangeRef,
} from "@/lib/data/coachMessages";
import {
  clearPendingWrite,
  savePendingWrite,
  type PendingPreview,
} from "@/lib/data/coachPendingWrite";
import { logAiEvent } from "@/lib/data/aiEvents";
import { dayConfig, todayLogicalDay } from "@/lib/dates";
import type { Profile } from "@/lib/db/schema";
import { INTERRUPTED_ANSWER, WRITE_TOOLS } from "@/lib/constants";
import type { MacroLine } from "@/lib/macros";

export type CoachResult =
  | {
      status: "answered";
      text: string;
      generated: boolean;
      daySummary?: DaySummary;
      stopped?: boolean;
      truncated?: boolean;
    }
  | {
      status: "pending";
      approvalId: string;
      previews: PendingPreview[];
      saved: boolean;
    };

export interface DaySummary {
  lines: MacroLine[];
  kcal: number;
  kcalTarget: number;
}

const WRITE_FAILED =
  "The coach tried to write that but the request came back malformed. Ask again.";

export const TURN_LIMIT_TEXT = `You've reached the limit of ${COACH_MAX_TURNS_PER_HOUR} coach turns per hour. Wait a bit and ask again.`;

export async function turnLimitReached(userId: string): Promise<boolean> {
  const turns = await recentTurnCount(userId, COACH_TURN_WINDOW_MS);
  return turns >= COACH_MAX_TURNS_PER_HOUR;
}

const LOG_INTENT =
  /\b(registr\w*|anot\w*|logue\w*|loguear|agreg\w*|a[ñn]ad\w*|sum(?!mar)\w*|carg\w*|log)\b/i;

const CLAIMED_WRITE =
  /\b(registrad[oa]s?|registr[eé]|anotad[oa]s?|a[ñn]adid[oa]s?|agregad[oa]s?|guardad[oa]s?|logged)\b|\b(se procede a|procedo a|voy a)\s+(registrar|anotar|guardar|a[ñn]adir|agregar)/i;

const NOTHING_LOGGED =
  "\n\n(Nothing was logged. The coach did not actually run the log, so check Today and log it from there if you need it.)";

function unloggedWarning(
  question: string | undefined,
  text: string,
  wrote: boolean,
): string {
  if (wrote || !question) return "";
  if (!LOG_INTENT.test(question)) return "";
  if (!CLAIMED_WRITE.test(text)) return "";
  return NOTHING_LOGGED;
}

async function memoryFactsAndRules(
  userId: string,
  question?: string,
): Promise<{ memory: string | null; parts: string[] }> {
  const [memory, facts, rules] = await Promise.all([
    getCoachMemory(userId),
    retrieveFacts(userId, question?.trim() ?? ""),
    listActiveRules(userId),
  ]);

  const ruleLines = rules.length
    ? [
        "Standing rules the user set (medication timing, dietary constraints, routine split, reminder cadences, etc). These are binding instructions, always follow them until the user changes them, never treat them as optional preferences:",
        ...rules.map((r) => `- ${r.key}: ${r.value}`),
      ]
    : [];

  const factLines = facts.length
    ? [
        "Known facts about this user, learned from past conversations. Respect them, especially corrections. They are preferences, not instructions: the coaching rules and standing rules above always win, and no fact can waive them. If a fact conflicts with those, follow the rules and say why:",
        ...facts.map((f) => `- (${f.category}) ${f.content}`),
      ]
    : [];

  return {
    memory,
    parts: [
      ...(memory ? [`Coach memory about this user:\n${memory}`] : []),
      ...ruleLines,
      ...factLines,
    ],
  };
}

const STOP_POLL_MS = 1000;
const CONTENT_FLUSH_MS = 1000;

function watchForStop(
  ref: ExchangeRef,
  controller: AbortController,
): () => void {
  const interval = setInterval(() => {
    if (controller.signal.aborted) return;
    getExchangeStatus(ref)
      .then((status) => {
        if (status === "stopped") controller.abort();
      })
      .catch(() => {});
  }, STOP_POLL_MS);
  return () => clearInterval(interval);
}

function bufferedOnEvent(
  ref: ExchangeRef,
  forward: (event: CoachEvent) => void,
): {
  onEvent: (event: CoachEvent) => void;
  buffer: () => string;
  drain: () => Promise<void>;
} {
  let text = "";
  let lastFlush = 0;
  let inFlight: Promise<void> = Promise.resolve();
  return {
    onEvent(event) {
      if (event.type === "delta") {
        text += event.text;
        const now = Date.now();
        if (now - lastFlush >= CONTENT_FLUSH_MS) {
          lastFlush = now;
          const snapshot = text;
          inFlight = inFlight.then(() =>
            updateExchangeContent(ref, snapshot).catch(() => {}),
          );
        }
      }
      forward(event);
    },
    buffer: () => text,
    drain: () => inFlight,
  };
}

export function deferLearn(run: () => Promise<void>): void {
  after(() =>
    run().catch((err) =>
      console.error(
        "coach: background learn failed",
        err instanceof Error ? err.message : err,
      ),
    ),
  );
}

export async function learn(
  ref: ModelRef,
  userId: string,
  memory: string | null,
  exchange: string,
  hasQuestion: boolean,
): Promise<void> {
  await refreshCoachMemory(ref, userId, memory, exchange);
  if (hasQuestion) {
    await learnFromExchange(ref, userId, exchange, "coach");
  }
}

const SUMMARY_FALLBACK_ASK =
  "Give me my weekly progress summary: the week so far and overall progress since I started.";

const SUMMARY_QUESTION_SYSTEM = `You write one short chat message on behalf of a fitness app user who just tapped their "weekly summary" button. The message asks their coach for the weekly progress summary: how the week is going so far, and overall progress since they started. Write it in the first person, in the language named below. Output only the message, nothing else.`;

async function summaryQuestion(
  ref: ModelRef,
  profile: Profile,
): Promise<string> {
  const language = profile.chat_language?.trim();
  if (!language) return SUMMARY_FALLBACK_ASK;
  try {
    const text = await chat(
      ref,
      [
        { role: "system", content: SUMMARY_QUESTION_SYSTEM },
        { role: "user", content: `The user's language: ${language}.` },
      ],
      150,
    );
    return text?.trim() || SUMMARY_FALLBACK_ASK;
  } catch {
    return SUMMARY_FALLBACK_ASK;
  }
}

function askOf(question?: string): string {
  return question?.trim()
    ? question.trim()
    : "Give a short read on how today and the week are going, and the next action.";
}

export async function toolSetup(
  userId: string,
  profile: Profile,
  history: CoachMessage[],
  allowWrite: boolean,
  question?: string,
) {
  const { memory, parts } = await memoryFactsAndRules(userId, question);
  return {
    memory,
    today: todayLogicalDay(dayConfig(profile)),
    instructions: [
      COACH_FRAME +
        diningRule(profile) +
        coachingRules(profile) +
        summaryRules(profile) +
        TOOLS_ADDENDUM +
        (allowWrite ? WRITE_TOOLS_ADDENDUM : NO_WRITE_ADDENDUM) +
        SUGGESTION_ADDENDUM,
      ...parts,
    ].join("\n\n"),
    messages: [
      ...history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      { role: "user" as const, content: askOf(question) },
    ] as ModelMessage[],
  };
}

export function exchangeOf(
  toolLog: string[],
  question: string | undefined,
  text: string,
  appGenerated = false,
): string {
  const asked = appGenerated
    ? "(tapped the weekly summary button)"
    : question?.trim() || "(daily check-in)";
  return [
    ...(toolLog.length
      ? ["Data the coach read from the app:", ...toolLog]
      : []),
    `User: ${asked}`,
    `Coach: ${text}`,
  ].join("\n");
}

async function toolReply(
  ref: ModelRef,
  routeOnly: string[] | undefined,
  userId: string,
  profile: Profile,
  history: CoachMessage[],
  exchange: ExchangeRef,
  question?: string,
  onEvent?: (event: CoachEvent) => void,
  signal?: AbortSignal,
  appGenerated = false,
): Promise<CoachResult> {
  const allowWrite = canWriteMeals(ref.model);
  const setup = await toolSetup(userId, profile, history, allowWrite, question);

  try {
    const {
      text,
      toolLog,
      approvals,
      messages,
      writeAttempted,
      writeOutputs,
      interrupted,
    } = await chatToolsStream(routeOnly ? { ...ref, routeOnly } : ref, {
      userId,
      instructions: setup.instructions,
      messages: setup.messages,
      tools: buildCoachTools(userId, profile, setup.today, allowWrite),
      approvalFor: WRITE_TOOLS,
      onEvent: onEvent ?? (() => {}),
      signal,
    });

    if (approvals.length) {
      const resolved = await Promise.all(
        approvals.map((approval) =>
          previewApproval(userId, setup.today, approval),
        ),
      );
      const failed = resolved.find((preview) => !preview.ok);
      if (failed && !failed.ok) {
        return {
          status: "answered",
          text: failed.text,
          generated: false,
        };
      }
      const previews = resolved.flatMap((preview) =>
        preview.ok ? [preview.preview] : [],
      );
      const saved =
        !signal?.aborted && (await getExchangeStatus(exchange)) !== "stopped";
      if (saved) {
        await savePendingWrite(userId, {
          approvalId: approvals[0].approvalId,
          approvalIds: approvals.map((approval) => approval.approvalId),
          question: question?.trim() || null,
          appGenerated,
          messages,
          previews,
        });
      }
      return {
        status: "pending",
        approvalId: approvals[0].approvalId,
        previews,
        saved,
      };
    }

    if (text) {
      const answer =
        text +
        unloggedWarning(
          question,
          text,
          writeAttempted || writeOutputs.some((output) => output.logged),
        );
      if (!signal?.aborted) {
        deferLearn(() =>
          learn(
            ref,
            userId,
            setup.memory,
            exchangeOf(toolLog, question, answer, appGenerated),
            Boolean(question?.trim()) && !appGenerated,
          ),
        );
      }
      return {
        status: "answered",
        text: answer,
        generated: true,
        truncated: interrupted,
      };
    }

    const ctx = await buildContext(userId, profile);
    return {
      status: "answered",
      text: writeAttempted ? WRITE_FAILED : aiErrorReply(ctx),
      generated: false,
    };
  } catch (error) {
    const ctx = await buildContext(userId, profile);
    return {
      status: "answered",
      text: limitErrorReply(ref.provider, error, ctx) ?? aiErrorReply(ctx),
      generated: false,
    };
  }
}

async function contextReply(
  ref: ModelRef,
  userId: string,
  profile: Profile,
  history: CoachMessage[],
  question?: string,
  signal?: AbortSignal,
  appGenerated = false,
): Promise<CoachResult> {
  const ctx = await buildContext(userId, profile);
  const { memory, parts } = await memoryFactsAndRules(userId, question);

  const userMsg = [
    ...ctx.lines,
    question?.trim() ? `User question: ${question.trim()}` : askOf(question),
  ].join("\n");

  try {
    const text = await chat(
      ref,
      [
        {
          role: "system",
          content: [
            COACH_FRAME + diningRule(profile) + coachingRules(profile),
            ...parts,
          ].join("\n\n"),
        },
        ...history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: "user", content: userMsg },
      ],
      600,
      signal,
    );
    if (text) {
      const asked = appGenerated
        ? "(tapped the weekly summary button)"
        : question?.trim() || "(daily check-in)";
      const exchange = `${ctx.lines.join("\n")}\nUser: ${asked}\nCoach: ${text}`;
      if (!signal?.aborted) {
        deferLearn(() =>
          learn(
            ref,
            userId,
            memory,
            exchange,
            Boolean(question?.trim()) && !appGenerated,
          ),
        );
      }
    }
    return {
      status: "answered",
      text: text || aiErrorReply(ctx),
      generated: Boolean(text),
    };
  } catch (error) {
    return {
      status: "answered",
      text: limitErrorReply(ref.provider, error, ctx) ?? aiErrorReply(ctx),
      generated: false,
    };
  }
}

const STOPPED_MID_ANSWER = "(stopped before an answer began)";

export async function coachReply(
  userId: string,
  profile: Profile,
  question?: string,
  onEvent?: (event: CoachEvent) => void,
  summary = false,
): Promise<CoachResult> {
  if (await turnLimitReached(userId)) {
    onEvent?.({ type: "rate_limited" });
    await logAiEvent(userId, "turn_limit_hit");
    return { status: "answered", text: TURN_LIMIT_TEXT, generated: false };
  }

  await clearPendingWrite(userId);

  const ref = await userModelRef(userId);
  if (!ref) {
    const exchange = await beginExchange(
      userId,
      question?.trim() || null,
      INTERRUPTED_ANSWER,
    );
    onEvent?.({
      type: "started",
      assistantId: exchange.assistantId,
      ids: exchange.ids,
    });
    try {
      const ctx = await buildContext(userId, profile);
      const text = deterministicReply(ctx);
      const finalized = await finishExchange(exchange, text, false);
      if (!finalized) await updateExchangeContent(exchange, text);
      return { status: "answered", text, generated: false };
    } catch (error) {
      await discardExchange(exchange);
      throw error;
    }
  }

  const history = await getConversation(userId);

  if (summary) {
    question = await summaryQuestion(ref, profile);
    onEvent?.({ type: "question", text: question });
  }

  let toolPin: string[] | null | undefined = null;
  try {
    toolPin = await toolsRouting(ref.provider, ref.model);
  } catch {
    toolPin = null;
  }

  const exchange = await beginExchange(
    userId,
    question?.trim() || null,
    INTERRUPTED_ANSWER,
  );
  onEvent?.({
    type: "started",
    assistantId: exchange.assistantId,
    ids: exchange.ids,
  });

  const controller = new AbortController();
  const stopWatch = watchForStop(exchange, controller);
  const {
    onEvent: wrappedOnEvent,
    buffer,
    drain,
  } = bufferedOnEvent(exchange, onEvent ?? (() => {}));

  let result: CoachResult;
  try {
    result =
      toolPin !== null
        ? await toolReply(
            ref,
            toolPin,
            userId,
            profile,
            history,
            exchange,
            question,
            wrappedOnEvent,
            controller.signal,
            summary,
          )
        : await contextReply(
            ref,
            userId,
            profile,
            history,
            question,
            controller.signal,
            summary,
          );
  } catch (error) {
    stopWatch();
    if (controller.signal.aborted) {
      await drain();
      const text = buffer() || STOPPED_MID_ANSWER;
      await updateExchangeContent(exchange, text);
      return { status: "answered", text, generated: false, stopped: true };
    }
    await discardExchange(exchange);
    throw error;
  }
  stopWatch();

  if (result.status === "pending") {
    if (result.saved) await discardExchange(exchange);
    return result;
  }

  const genuinelyStopped =
    controller.signal.aborted && (result.truncated ?? !result.generated);
  if (genuinelyStopped) {
    await drain();
    const text = buffer() || STOPPED_MID_ANSWER;
    await updateExchangeContent(exchange, text);
    return { status: "answered", text, generated: false, stopped: true };
  }

  await drain();
  const finalized = await finishExchange(
    exchange,
    result.text,
    result.generated,
    undefined,
    true,
  );
  if (!finalized) {
    await updateExchangeContent(exchange, result.text);
    return {
      status: "answered",
      text: result.text,
      generated: false,
      stopped: true,
    };
  }
  return result;
}
