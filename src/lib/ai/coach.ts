import "server-only";

import type { ModelMessage } from "ai";
import { after } from "next/server";

import { userModelRef, type ModelRef } from "@/lib/ai/aiCredentials";
import { toolsRouting } from "@/lib/ai/capabilities";
import { buildContext, buildReminderLines } from "@/lib/ai/coachContext";
import {
  aiErrorReply,
  askOf,
  deterministicReply,
  exchangeOf,
  learnedAddendum,
  limitErrorReply,
  unloggedWarning,
} from "@/lib/ai/coachReplyText";
import { bufferedOnEvent, watchForStop } from "@/lib/ai/coachStreamControl";
import { offCatalogWarning } from "@/lib/ai/coachSuggestionGate";
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
import { learnFromMessage, retrieveFacts } from "@/lib/ai/facts";
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
import {
  logAiEvent,
  logExchange,
  type UsageTotals,
} from "@/lib/data/aiEvents";
import { dayConfig, todayLogicalDay } from "@/lib/dates";
import type { Profile } from "@/lib/db/schema";
import {
  CATALOG_SEARCH_TOOL,
  INTERRUPTED_ANSWER,
  WRITE_TOOLS,
} from "@/lib/constants";
import type { MacroLine } from "@/lib/macros";

export type CoachResult =
  | {
      status: "answered";
      text: string;
      generated: boolean;
      daySummary?: DaySummary;
      stopped?: boolean;
      truncated?: boolean;
      learned?: string[];
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

async function memoryFactsAndRules(
  userId: string,
  profile: Profile,
  today: string,
  question?: string,
): Promise<{ memory: string | null; parts: string[] }> {
  const [memory, facts, rules, reminderLines] = await Promise.all([
    getCoachMemory(userId),
    retrieveFacts(userId, question?.trim() ?? ""),
    listActiveRules(userId),
    buildReminderLines(userId, dayConfig(profile), today),
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

  const reminderBlock = reminderLines.length
    ? [
        "Overdue/upcoming reminders. Raise these yourself even if the user did not ask, but only once per conversation, do not repeat one you already raised:",
        ...reminderLines,
      ]
    : [];

  return {
    memory,
    parts: [
      ...(memory ? [`Coach memory about this user:\n${memory}`] : []),
      ...ruleLines,
      ...factLines,
      ...reminderBlock,
    ],
  };
}

export function deferMemory(
  ref: ModelRef,
  userId: string,
  memory: string | null,
  exchange: string,
): void {
  after(() =>
    refreshCoachMemory(ref, userId, memory, exchange).catch((err) =>
      console.error(
        "coach: background memory refresh failed",
        err instanceof Error ? err.message : err,
      ),
    ),
  );
}

export async function learnFromQuestion(
  ref: ModelRef,
  userId: string,
  question: string | undefined,
  appGenerated: boolean,
  signal?: AbortSignal,
): Promise<string[]> {
  if (appGenerated || !question?.trim()) return [];
  return learnFromMessage(ref, userId, question.trim(), "coach", signal);
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

export async function toolSetup(
  userId: string,
  profile: Profile,
  history: CoachMessage[],
  allowWrite: boolean,
  question?: string,
  learned: string[] = [],
) {
  const today = todayLogicalDay(dayConfig(profile));
  const { memory, parts } = await memoryFactsAndRules(userId, profile, today, question);
  return {
    memory,
    today,
    instructions: [
      COACH_FRAME +
        diningRule(profile) +
        coachingRules(profile) +
        summaryRules(profile) +
        TOOLS_ADDENDUM +
        (allowWrite ? WRITE_TOOLS_ADDENDUM : NO_WRITE_ADDENDUM) +
        SUGGESTION_ADDENDUM,
      ...parts,
      ...learnedAddendum(learned),
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
  const learned = await learnFromQuestion(ref, userId, question, appGenerated, signal);
  const setup = await toolSetup(
    userId,
    profile,
    history,
    allowWrite,
    question,
    learned,
  );

  try {
    const {
      text,
      toolLog,
      approvals,
      messages,
      writeAttempted,
      writeOutputs,
      interrupted,
      usage,
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
          learned,
          messages,
          previews,
          askedAt: exchange.askedAt.toISOString(),
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
        ) +
        (await offCatalogWarning(
          ref,
          userId,
          text,
          toolLog.some((entry) => entry.startsWith(`${CATALOG_SEARCH_TOOL}(`)),
        ));
      if (!signal?.aborted) {
        deferMemory(
          ref,
          userId,
          setup.memory,
          exchangeOf(toolLog, question, answer, appGenerated),
        );
      }
      after(() =>
        logExchange(
          userId,
          ref,
          exchange.assistantId,
          setup.instructions,
          usage,
        ),
      );
      return {
        status: "answered",
        text: answer,
        generated: true,
        truncated: interrupted,
        learned,
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
  exchange: ExchangeRef,
  question?: string,
  signal?: AbortSignal,
  appGenerated = false,
): Promise<CoachResult> {
  const ctx = await buildContext(userId, profile);
  const learned = await learnFromQuestion(ref, userId, question, appGenerated, signal);
  const { memory, parts } = await memoryFactsAndRules(
    userId,
    profile,
    ctx.today,
    question,
  );

  const userMsg = [
    ...ctx.lines,
    question?.trim() ? `User question: ${question.trim()}` : askOf(question),
  ].join("\n");

  const instructions = [
    COACH_FRAME + diningRule(profile) + coachingRules(profile),
    ...parts,
    ...learnedAddendum(learned),
  ].join("\n\n");

  try {
    let usage: UsageTotals = {};
    const text = await chat(
      ref,
      [
        { role: "system", content: instructions },
        ...history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: "user", content: userMsg },
      ],
      600,
      signal,
      (totals) => {
        usage = totals;
      },
    );
    if (text) {
      const asked = appGenerated
        ? "(tapped the weekly summary button)"
        : question?.trim() || "(daily check-in)";
      const transcript = `${ctx.lines.join("\n")}\nUser: ${asked}\nCoach: ${text}`;
      if (!signal?.aborted) deferMemory(ref, userId, memory, transcript);
      after(() =>
        logExchange(userId, ref, exchange.assistantId, instructions, usage),
      );
    }
    return {
      status: "answered",
      text: text || aiErrorReply(ctx),
      generated: Boolean(text),
      learned,
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
      const finalized = await finishExchange(exchange, text, { generated: false });
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
            exchange,
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
  const finalized = await finishExchange(exchange, result.text, {
    generated: result.generated,
    force: true,
    learned: result.learned,
  });
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
