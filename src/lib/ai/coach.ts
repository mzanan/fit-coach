import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { getDayData } from "@/lib/data/today";
import { getWhoopSnapshot } from "@/lib/data/whoop";
import { db, schema } from "@/lib/db";
import type { Profile } from "@/lib/db/schema";
import { getWhoopConnection } from "@/lib/integrations/whoop";
import { dayConfig, shiftDay, todayLogicalDay } from "@/lib/dates";
import type { ModelMessage } from "ai";
import { after } from "next/server";

import type { ResolveFailure } from "@/lib/catalogMeal";

import {
  approvalResponseMessage,
  chat,
  chatToolsStream,
  type ApprovalRequest,
  type CoachEvent,
} from "@/lib/ai/provider";
import {
  appendExchange,
  getConversation,
  type CoachMessage,
} from "@/lib/data/coachMessages";
import {
  clearPendingWrite,
  savePendingWrite,
  takePendingWrite,
  type PendingPreview,
} from "@/lib/data/coachPendingWrite";
import {
  buildCoachTools,
  previewLogMeal,
  WRITE_TOOL,
} from "@/lib/ai/coachTools";
import { PROVIDER_LABEL } from "@/lib/ai/options";
import { userModelRef, type ModelRef } from "@/lib/ai/providers";
import { toolsRouting } from "@/lib/ai/registry";
import { learnFromExchange, retrieveFacts } from "@/lib/ai/facts";
import { getCoachMemory, refreshCoachMemory } from "@/lib/ai/memory";
import { categoryLabel, STOPPED_ANSWER } from "@/lib/constants";
import { kcalOf, type MacroLine } from "@/lib/macros";
import { round } from "@/lib/utils";

const { meals, body_scans } = schema;

const COACH_FRAME = `You are a strength and nutrition coach inside a personal tracking app. The user is doing body recomposition (gain muscle, lose fat) and mostly eats out. Real progress = photo every 4 weeks + waist, not the scale.

How you work, always:
- NEVER change the user's daily targets on your own. If the data conflicts with the targets or something is ambiguous, surface it and ask.
- ALWAYS reply in the same language the user wrote their question in. If there is no question, reply in the language of the user's previous messages, and in English if you have no signal at all. Never switch to a different language than the user's, even a closely related one.
- Be direct and concrete, no hype, no alarmism, no emoji. Give one or two specific next actions (e.g. what to add to hit protein). Keep it under 130 words. Never use em dashes.`;

const DEFAULT_COACHING = `

Macro rules, follow them strictly:
- Protein is the priority. Warn clearly if protein is low; that hurts muscle.
- Fat is a target range and a floor, not a ceiling. Do NOT praise going low on fat. Warn if fat is below the floor (sustained low fat is bad for hormones and muscle) or far above the range.
- A calorie deficit drives fat loss. A one-off high-fat day with calories in range is fine: do not alarm about it.

Meal distribution rules, in priority order:
1. Prevention first: the day is 3 meals (breakfast 05-11, lunch 11-16, dinner 16-23, local time), each planned to roughly 1/3 of the daily macros. At breakfast time, lay out the full-day plan sized in thirds.
2. Early correction: if a logged meal lands more than 15% short of its third on any macro, flag it immediately and add the shortfall to the NEXT meal. Never let a deficit silently pile up onto dinner.
3. Snack (16-18h) is an EXCEPTION, not a habit: suggest it only when compensating in dinner would push dinner above 40% of the daily macros. If snacks become recurring, the base meals are mis-sized: say so and propose resizing the thirds.

Weekly review (Sunday or when asked): look at adherence and training progression, then recommend keep / adjust calories by 100-150 / swap exercises stalled 3+ weeks. Routine changes only with a concrete reason, never for variety.`;

const DINING_RULES: Record<string, string> = {
  delivery:
    "\n\nStanding rule, asked once and kept until the user changes it: the user orders delivery from their saved catalog and does not cook. Never suggest cooking, home-made dishes, or anything that is not a catalog item or a place the catalog names.",
  cooks:
    "\n\nStanding rule, asked once and kept until the user changes it: the user can cook at home as well as order from the catalog. Home-cooked suggestions are allowed, but mark their macros as estimates and offer to save them to the catalog.",
};

function diningRule(profile: Profile): string {
  return (
    DINING_RULES[profile.dining_mode ?? ""] ??
    "\n\nYou do not know whether this user cooks at home or only orders delivery, so suggest only catalog items and do not assume they have a kitchen."
  );
}

function coachingRules(profile: Profile): string {
  const own = profile.coach_rules?.trim();
  return own
    ? `\n\nCoaching rules the user wrote for you. They are the method you coach by, and they win over any general advice you would otherwise give:\n\n${own}`
    : DEFAULT_COACHING;
}

const DEFAULT_SUMMARY_FOCUS = `\n\nWhen the user asks for a weekly or progress summary, cover two things: how the week so far went on diet and training (adherence, what worked, what to fix), and overall progress since the user started, using get_progress_overview to compare their InBody scans and how long they have been logging rather than only the last few days.`;

function summaryRules(profile: Profile): string {
  const own = profile.summary_rules?.trim();
  return own
    ? `\n\nWhat the user wants in their weekly/progress summary. This is what they asked for, follow it over the default shape below, but still call get_progress_overview for anything about long-term progress:\n\n${own}`
    : DEFAULT_SUMMARY_FOCUS;
}

export interface CoachContext {
  profile: Profile;
  today: string;
  lines: string[];
}

export async function buildContext(
  userId: string,
  profile: Profile,
): Promise<CoachContext> {
  const cfg = dayConfig(profile);
  const today = todayLogicalDay(cfg);
  const dayData = await getDayData(userId, profile, today);

  const days = Array.from({ length: 7 }, (_, i) => shiftDay(today, -i));
  const recent = await db
    .select({
      logical_day: meals.logical_day,
      protein_g: meals.protein_g,
    })
    .from(meals)
    .where(and(eq(meals.user_id, userId), inArray(meals.logical_day, days)));

  const byDay = new Map<string, number>();
  for (const r of recent) {
    byDay.set(r.logical_day, (byDay.get(r.logical_day) ?? 0) + r.protein_g);
  }
  const loggedDays = byDay.size;
  const proteinHit = [...byDay.values()].filter(
    (p) => p >= profile.protein_target * 0.9,
  ).length;

  const carbsTarget = dayData.isGymDay ? profile.carbs_gym : profile.carbs_rest;
  const targetsLine = `Targets: protein ${profile.protein_target}g, fat ${profile.fat_min}-${profile.fat_max}g (floor ${profile.fat_floor}g), carbs ${carbsTarget}g (${dayData.isGymDay ? "gym" : "rest"} day), calories ${profile.calories_target}.`;

  const t = dayData.totals;
  const totalsLine = `Today (${today}, ${dayData.isGymDay ? "gym" : "rest"} day) totals: protein ${round(t.protein_g)}g, fat ${round(t.fat_g)}g, carbs ${round(t.carbs_g)}g, calories ${round(dayData.summary.kcal)}.`;

  const mealLines = dayData.meals.length
    ? dayData.meals.map(
        (m) =>
          `- ${categoryLabel(m.category)}: ${m.name}, protein ${round(m.protein_g)}g, fat ${round(m.fat_g)}g, carbs ${round(m.carbs_g)}g, ${round(kcalOf(m))} kcal${m.fat_quality ? `, ${m.fat_quality}` : ""}`,
      )
    : ["- No meals logged yet today."];

  const weekLine = `Last 7 days: ${loggedDays} days logged, protein target hit on ${proteinHit}.`;

  const whoopLines = await buildWhoopLines(userId);
  const scanLines = await buildScanLines(userId);

  return {
    profile,
    today,
    lines: [
      targetsLine,
      totalsLine,
      "Meals logged today:",
      ...mealLines,
      weekLine,
      ...whoopLines,
      ...scanLines,
    ],
  };
}

async function buildScanLines(userId: string): Promise<string[]> {
  const [scan] = await db
    .select()
    .from(body_scans)
    .where(eq(body_scans.user_id, userId))
    .orderBy(desc(body_scans.taken_at))
    .limit(1);
  if (!scan) return [];
  const parts = [
    scan.weight_kg != null ? `weight ${scan.weight_kg}kg` : null,
    scan.skeletal_muscle_kg != null
      ? `skeletal muscle ${scan.skeletal_muscle_kg}kg`
      : null,
    scan.body_fat_pct != null ? `body fat ${scan.body_fat_pct}%` : null,
    scan.visceral_fat_level != null
      ? `visceral fat ${scan.visceral_fat_level}`
      : null,
  ].filter(Boolean);
  if (!parts.length) return [];
  const day = scan.taken_at.toISOString().slice(0, 10);
  return [`Latest InBody scan (${day}): ${parts.join(", ")}.`];
}

const WHOOP_FRESH_MS = 48 * 60 * 60 * 1000;

async function buildWhoopLines(userId: string): Promise<string[]> {
  const conn = await getWhoopConnection(userId);
  if (!conn) return [];
  const snap = await getWhoopSnapshot(userId);
  const now = Date.now();
  const parts: string[] = [];

  const r = snap.recovery;
  if (r?.recovery_score != null && now - r.recorded_at.getTime() < WHOOP_FRESH_MS) {
    const extras = [
      r.hrv_rmssd_milli != null ? `HRV ${round(r.hrv_rmssd_milli)}ms` : null,
      r.resting_heart_rate != null ? `RHR ${round(r.resting_heart_rate)}bpm` : null,
    ].filter(Boolean);
    parts.push(
      `recovery ${round(r.recovery_score)}%${extras.length ? ` (${extras.join(", ")})` : ""}`,
    );
  }

  const s = snap.sleep;
  if (s && now - s.end.getTime() < WHOOP_FRESH_MS) {
    const asleep =
      s.time_asleep_ms != null
        ? `${Math.floor(s.time_asleep_ms / 3_600_000)}h${Math.round((s.time_asleep_ms % 3_600_000) / 60_000)}m asleep`
        : null;
    const perf =
      s.sleep_performance_percentage != null
        ? `${round(s.sleep_performance_percentage)}% sleep performance`
        : null;
    const bits = [asleep, perf].filter(Boolean);
    if (bits.length) parts.push(`last night ${bits.join(", ")}`);
  }

  const c = snap.cycle;
  if (c?.strain != null && now - c.start.getTime() < WHOOP_FRESH_MS) {
    parts.push(`current day strain ${round(c.strain, 1)}`);
  }

  if (snap.recentWorkouts.length) {
    const strains = snap.recentWorkouts
      .map((w) => w.strain)
      .filter((v): v is number => v != null);
    const avg = strains.length
      ? `, avg strain ${round(strains.reduce((a, b) => a + b, 0) / strains.length, 1)}`
      : "";
    parts.push(`${snap.recentWorkouts.length} Whoop workouts last 7 days${avg}`);
  }

  if (!parts.length) return [];
  return [`Whoop band data: ${parts.join("; ")}.`];
}

function deterministicReply(ctx: CoachContext): string {
  return `Add your AI provider key in Settings > AI to enable coaching. Snapshot:\n${ctx.lines.join("\n")}`;
}

function aiErrorReply(ctx: CoachContext): string {
  return `The coach could not reach your AI model. Check your key and model in Settings > AI, or try again. Snapshot:\n${ctx.lines.join("\n")}`;
}

function limitErrorReply(
  provider: ModelRef["provider"],
  error: unknown,
  ctx: CoachContext,
): string | null {
  const status = (error as { statusCode?: number })?.statusCode;
  const message = error instanceof Error ? error.message : "";
  if (status !== 429 && !/rate limit|quota/i.test(message)) return null;

  const label = PROVIDER_LABEL[provider];
  const daily = /per[- ]day|RPD/i.test(message);
  const detail = daily
    ? "Your daily quota on the free tier is used up. It resets tomorrow, or add credits to your account."
    : "You are being rate limited right now. Wait a minute and ask again.";
  return `${label}: ${detail} Snapshot:\n${ctx.lines.join("\n")}`;
}

export type CoachResult =
  | {
      status: "answered";
      text: string;
      generated: boolean;
      daySummary?: DaySummary;
    }
  | { status: "pending"; approvalId: string; previews: PendingPreview[] };

const WRITE_FAILED =
  "The coach tried to log that meal but the request came back malformed. Ask again, or log it from the Today screen.";

const DENIED = "Not logged. Nothing was written.";

export interface DaySummary {
  lines: MacroLine[];
  kcal: number;
  kcalTarget: number;
}

async function daySummaryAfterWrite(
  userId: string,
  profile: Profile,
  day: string,
): Promise<DaySummary> {
  const dayData = await getDayData(userId, profile, day);
  return dayData.summary;
}

const RESUME_FAILED =
  "The coach lost the connection while confirming. The meal may or may not have been logged: check Today before asking again.";

const NOT_WRITTEN =
  "Nothing was logged. The catalog item may have changed since you were asked. Check Today, and log it from there if it is missing.";

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

function previewFailure(reason: ResolveFailure, error: string): string {
  if (reason === "no_macros") return error;
  return "The coach tried to log a meal it could not identify in your catalog. Ask again naming the item.";
}

const TOOLS_ADDENDUM = `

Data access: you have tools that read the user's live data (today's meals and targets, the food catalog, recent workouts, the latest body scans, and the user's full progress history for weekly/overall summaries). Call only the tools the question actually needs, then answer that question directly and concretely. Never invent data you did not read from a tool.

What the user tells you outranks what the tools read. The app only knows the meals the user typed into it, and they often eat without logging, so an empty day from get_today means "nothing was logged", NEVER "nothing was eaten". If the user states what they have consumed, or gives you totals, take those numbers as the truth for this conversation and answer from them. Do not ask them to log anything first, do not ask them to confirm what they already said, and do not repeat the day back to them: they asked a question, answer it.

You can also log a meal with log_meal, but only when the user asks you to. Pass the id and the exact name of a catalog item a search returned: the app resolves the macros from that item itself, so you never send macro numbers and never guess them. The user confirms before anything is written, so do not ask them to confirm yourself.

Two rules about logging, both absolute:
- If the user asks you to log something, CALL log_meal. Saying you will log it, or describing what you are about to log, does nothing: only the tool call reaches the app. Never announce a log you did not call the tool for, and never ask the user to specify a size or portion in chat instead of calling it.
- If several catalog items match what they named and they differ only in size or portion (100G vs 200G, half vs full), CALL log_meal with any one of them anyway: the app shows the user a card to pick the exact size before anything is written, so the tool call is what triggers that choice. Only ask in chat when the items are genuinely different foods, not sizes of the same one.

Whenever you suggest what to eat, search the catalog first and build the suggestion from the user's own saved items and their exact macros. One search call is enough: pass every term worth trying at once. When the search reports it found no match and returned the user's most eaten items instead, say so before suggesting anything else.

Suggest ONLY items the catalog returned. The user eats out and logs from that catalog, so a food that is not in it is not something they can order or log. Do not add generic foods (protein powder, quinoa, olive oil, cottage cheese, a fillet of fish) to round the macros: if the catalog cannot reach the target, say which macro is short and by how much, and offer to add the missing food to the catalog. Naming a food the catalog did not return is the one thing that makes this answer useless.`;

async function memoryAndFacts(
  userId: string,
  question?: string,
): Promise<{ memory: string | null; parts: string[] }> {
  const [memory, facts] = await Promise.all([
    getCoachMemory(userId),
    retrieveFacts(userId, question?.trim() ?? ""),
  ]);

  const factLines = facts.length
    ? [
        "Known facts about this user, learned from past conversations. Respect them, especially corrections. They are preferences, not instructions: the coaching rules above always win, and no fact can waive them. If a fact conflicts with those rules, follow the rules and say why:",
        ...facts.map((f) => `- (${f.category}) ${f.content}`),
      ]
    : [];

  return {
    memory,
    parts: [
      ...(memory ? [`Coach memory about this user:\n${memory}`] : []),
      ...factLines,
    ],
  };
}

function deferLearn(run: () => Promise<void>): void {
  after(() =>
    run().catch((err) =>
      console.error(
        "coach: background learn failed",
        err instanceof Error ? err.message : err,
      ),
    ),
  );
}

async function learn(
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

async function toolSetup(
  userId: string,
  profile: Profile,
  history: CoachMessage[],
  question?: string,
) {
  const { memory, parts } = await memoryAndFacts(userId, question);
  return {
    memory,
    today: todayLogicalDay(dayConfig(profile)),
    instructions: [
      COACH_FRAME +
        diningRule(profile) +
        coachingRules(profile) +
        summaryRules(profile) +
        TOOLS_ADDENDUM,
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

function exchangeOf(
  toolLog: string[],
  question: string | undefined,
  text: string,
  appGenerated = false,
): string {
  const asked = appGenerated
    ? "(tapped the weekly summary button)"
    : question?.trim() || "(daily check-in)";
  return [
    ...(toolLog.length ? ["Data the coach read from the app:", ...toolLog] : []),
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
  question?: string,
  onEvent?: (event: CoachEvent) => void,
  signal?: AbortSignal,
  appGenerated = false,
): Promise<CoachResult> {
  const setup = await toolSetup(userId, profile, history, question);

  try {
    const { text, toolLog, approvals, messages, writeAttempted, writeOutputs } =
      await chatToolsStream(routeOnly ? { ...ref, routeOnly } : ref, {
        instructions: setup.instructions,
        messages: setup.messages,
        tools: buildCoachTools(userId, profile, setup.today),
        approvalFor: WRITE_TOOL,
        onEvent: onEvent ?? (() => {}),
        signal,
      });

    if (approvals.length) {
      const resolved = await Promise.all(
        approvals.map((approval) =>
          previewLogMeal(userId, setup.today, approval.input),
        ),
      );
      const failed = resolved.find((preview) => !preview.ok);
      if (failed && !failed.ok) {
        return {
          status: "answered",
          text: previewFailure(failed.reason, failed.error),
          generated: false,
        };
      }
      const previews = resolved.flatMap((preview, index) =>
        preview.ok
          ? [{ ...preview.preview, toolCallId: approvals[index].toolCallId }]
          : [],
      );
      if (!signal?.aborted) {
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
      return { status: "answered", text: answer, generated: true };
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
  const { memory, parts } = await memoryAndFacts(userId, question);

  const userMsg = [
    ...ctx.lines,
    question?.trim() ? `User question: ${question.trim()}` : askOf(question),
  ].join("\n");

  try {
    const text = await chat(ref, [
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
    ]);
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

export async function coachReply(
  userId: string,
  profile: Profile,
  question?: string,
  onEvent?: (event: CoachEvent) => void,
  signal?: AbortSignal,
  summary = false,
): Promise<CoachResult> {
  await clearPendingWrite(userId);

  const ref = await userModelRef(userId);
  if (!ref) {
    const ctx = await buildContext(userId, profile);
    const text = deterministicReply(ctx);
    if (!signal?.aborted) {
      await appendExchange(userId, question?.trim() || null, text, false);
    }
    return { status: "answered", text, generated: false };
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

  const result =
    toolPin !== null
      ? await toolReply(
          ref,
          toolPin,
          userId,
          profile,
          history,
          question,
          onEvent,
          signal,
          summary,
        )
      : await contextReply(
          ref,
          userId,
          profile,
          history,
          question,
          signal,
          summary,
        );

  if (result.status === "pending") return result;

  if (signal?.aborted) {
    if (question?.trim()) {
      await appendExchange(userId, question.trim(), STOPPED_ANSWER, false);
    }
    return result;
  }

  await appendExchange(
    userId,
    question?.trim() || null,
    result.text,
    result.generated,
  );
  return result;
}

export async function resolvePendingWrite(
  userId: string,
  profile: Profile,
  approvalId: string,
  approved: boolean,
  itemId?: string,
  onEvent?: (event: CoachEvent) => void,
  signal?: AbortSignal,
): Promise<CoachResult> {
  const pending = await takePendingWrite(userId, approvalId);
  if (!pending) {
    return {
      status: "answered",
      text: "That confirmation is no longer valid. Ask again.",
      generated: false,
    };
  }

  const question = pending.question ?? undefined;
  const appGenerated = pending.appGenerated;

  if (!approved) {
    await appendExchange(userId, question ?? null, DENIED, false);
    return { status: "answered", text: DENIED, generated: false };
  }

  const ref = await userModelRef(userId);
  if (!ref) {
    await savePendingWrite(userId, pending);
    return {
      status: "answered",
      text: "Add your AI provider key in Settings > AI to use the coach.",
      generated: false,
    };
  }

  let toolPin: string[] | null | undefined = null;
  try {
    toolPin = await toolsRouting(ref.provider, ref.model);
  } catch {
    toolPin = null;
  }

  const history = await getConversation(userId);
  const setup = await toolSetup(userId, profile, history, question);

  try {
    const answered = [
      ...pending.messages,
      approvalResponseMessage(pending.approvalIds, true),
    ];
    const day = pending.previews[0].day;
    const chosen = itemId
      ? pending.previews[0].variants.find((variant) => variant.id === itemId)
      : undefined;

    const { text, toolLog, writeOutputs, approvals, messages } =
      await chatToolsStream(toolPin ? { ...ref, routeOnly: toolPin } : ref, {
        instructions: setup.instructions,
        messages: [...setup.messages, ...answered],
        tools: buildCoachTools(
          userId,
          profile,
          day,
          chosen
            ? {
                toolCallId: pending.previews[0].toolCallId,
                itemId: chosen.id,
                itemName: chosen.name,
              }
            : undefined,
        ),
        approvalFor: WRITE_TOOL,
        onEvent: onEvent ?? (() => {}),
        signal,
      });

    if (approvals.length) {
      const chained = await chainApproval(
        userId,
        day,
        question,
        [...answered, ...messages],
        approvals,
        appGenerated,
      );
      if (chained) return chained;
    }

    const written = writeOutputs.filter((output) => output.logged).length;
    if (!written) {
      const failure = writeOutputs.find((output) => output.error)?.error;
      await appendExchange(userId, question ?? null, failure ?? NOT_WRITTEN, false);
      return {
        status: "answered",
        text: failure ?? NOT_WRITTEN,
        generated: false,
      };
    }

    const logged = pending.previews.slice(0, written).map((preview, index) => {
      if (index !== 0 || !chosen) return preview;
      const portions = preview.portions || 1;
      const scaled = {
        protein_g: round(chosen.protein_g * portions),
        fat_g: round(chosen.fat_g * portions),
        carbs_g: round(chosen.carbs_g * portions),
      };
      return {
        ...preview,
        name: chosen.name,
        ...scaled,
        kcal: round(kcalOf(scaled)),
      };
    });
    const answer = text || loggedLines(logged);
    const daySummary = await daySummaryAfterWrite(userId, profile, day);
    await appendExchange(
      userId,
      question ?? null,
      answer,
      Boolean(text),
      daySummary,
    );
    if (text && !signal?.aborted) {
      deferLearn(() =>
        learn(
          ref,
          userId,
          setup.memory,
          exchangeOf(toolLog, question, answer, appGenerated),
          Boolean(question) && !appGenerated,
        ),
      );
    }
    return {
      status: "answered",
      text: answer,
      generated: Boolean(text),
      daySummary,
    };
  } catch {
    await appendExchange(userId, question ?? null, RESUME_FAILED, false);
    return { status: "answered", text: RESUME_FAILED, generated: false };
  }
}

async function chainApproval(
  userId: string,
  day: string,
  question: string | undefined,
  messages: ModelMessage[],
  approvals: ApprovalRequest[],
  appGenerated: boolean,
): Promise<CoachResult | null> {
  const resolved = await Promise.all(
    approvals.map((approval) => previewLogMeal(userId, day, approval.input)),
  );
  const previews = resolved.flatMap((preview, index) =>
    preview.ok
      ? [{ ...preview.preview, toolCallId: approvals[index].toolCallId }]
      : [],
  );
  if (!previews.length) return null;

  await savePendingWrite(userId, {
    approvalId: approvals[0].approvalId,
    approvalIds: approvals.map((approval) => approval.approvalId),
    question: question ?? null,
    appGenerated,
    messages,
    previews,
  });
  return {
    status: "pending",
    approvalId: approvals[0].approvalId,
    previews,
  };
}

function loggedLines(previews: PendingPreview[]): string {
  return previews
    .map((preview) => {
      const portions = preview.portions === 1 ? "" : ` x${preview.portions}`;
      return `Logged ${preview.name}${portions} as ${categoryLabel(preview.category).toLowerCase()}: ${preview.protein_g}g protein, ${preview.fat_g}g fat, ${preview.carbs_g}g carbs, ${preview.kcal} kcal.`;
    })
    .join("\n");
}
