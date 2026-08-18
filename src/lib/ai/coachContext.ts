import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import type { ModelRef } from "@/lib/ai/aiCredentials";
import { PROVIDER_LABEL } from "@/lib/ai/options";
import type { ResolveFailure } from "@/lib/catalogMeal";
import { categoryLabel, fatigueTimeLabel, measurementUnit } from "@/lib/constants";
import { dayConfig, shiftDay, todayLogicalDay, type DayConfig } from "@/lib/dates";
import { getLatestMeasurement } from "@/lib/data/bodyMeasurements";
import { getDayFatigue } from "@/lib/data/fatigueLogs";
import { getDayData } from "@/lib/data/today";
import { getUpcomingReminders } from "@/lib/reminders";
import { getWhoopSnapshot } from "@/lib/data/whoop";
import { db, schema } from "@/lib/db";
import type { Profile } from "@/lib/db/schema";
import { getWhoopConnection } from "@/lib/integrations/whoop";
import { kcalOf } from "@/lib/macros";
import { round } from "@/lib/utils";

const { meals, body_scans } = schema;

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

  const fatigueLines = await buildFatigueLines(userId, today);
  const whoopLines = await buildWhoopLines(userId);
  const scanLines = await buildScanLines(userId);
  const measurementLines = await buildMeasurementLines(userId);
  const reminderLines = await buildReminderLines(userId, cfg, today);

  return {
    profile,
    today,
    lines: [
      targetsLine,
      totalsLine,
      "Meals logged today:",
      ...mealLines,
      weekLine,
      ...fatigueLines,
      ...whoopLines,
      ...scanLines,
      ...measurementLines,
      ...reminderLines,
    ],
  };
}

export async function buildReminderLines(
  userId: string,
  cfg: DayConfig,
  today: string,
): Promise<string[]> {
  const reminders = await getUpcomingReminders(userId, cfg, today);
  if (!reminders.length) return [];
  return reminders.map((reminder) => {
    const statusText =
      reminder.status === "overdue"
        ? "overdue"
        : `due ${reminder.due_day}`;
    const lastText = reminder.last_day ? `, last ${reminder.last_day}` : "";
    return `Reminder (${statusText}): ${reminder.label}${lastText}.`;
  });
}

export async function buildMeasurementLines(userId: string): Promise<string[]> {
  const [waist, weight] = await Promise.all([
    getLatestMeasurement(userId, "waist"),
    getLatestMeasurement(userId, "weight"),
  ]);
  const parts = [
    waist?.value != null
      ? `waist ${waist.value}${measurementUnit("waist")} (${waist.logical_day})`
      : null,
    weight?.value != null
      ? `weight ${weight.value}${measurementUnit("weight")} (${weight.logical_day})`
      : null,
  ].filter((part): part is string => Boolean(part));
  if (!parts.length) return [];
  return [`Latest logged measurements: ${parts.join(", ")}.`];
}

export async function buildFatigueLines(
  userId: string,
  today: string,
): Promise<string[]> {
  const rows = await getDayFatigue(userId, today);
  if (!rows.length) return [];
  const parts = rows.map((row) =>
    row.score != null
      ? `${fatigueTimeLabel(row.time_of_day)} ${row.score}/5`
      : `${fatigueTimeLabel(row.time_of_day)} sleep logged, energy score pending`,
  );
  return [`Fatigue logged today: ${parts.join(", ")}.`];
}

export async function buildScanLines(userId: string): Promise<string[]> {
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

export async function buildWhoopLines(userId: string): Promise<string[]> {
  const conn = await getWhoopConnection(userId);
  if (!conn) return [];
  const snap = await getWhoopSnapshot(userId);
  const now = Date.now();
  const parts: string[] = [];

  const r = snap.recovery;
  if (
    r?.recovery_score != null &&
    now - r.recorded_at.getTime() < WHOOP_FRESH_MS
  ) {
    const extras = [
      r.hrv_rmssd_milli != null ? `HRV ${round(r.hrv_rmssd_milli)}ms` : null,
      r.resting_heart_rate != null
        ? `RHR ${round(r.resting_heart_rate)}bpm`
        : null,
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
    parts.push(
      `${snap.recentWorkouts.length} Whoop workouts last 7 days${avg}`,
    );
  }

  if (!parts.length) return [];
  return [`Whoop band data: ${parts.join("; ")}.`];
}

export function deterministicReply(ctx: CoachContext): string {
  return `Add your AI provider key in Settings > AI to enable coaching. Snapshot:\n${ctx.lines.join("\n")}`;
}

export function aiErrorReply(ctx: CoachContext): string {
  return `The coach could not reach your AI model. Check your key and model in Settings > AI, or try again. Snapshot:\n${ctx.lines.join("\n")}`;
}

export function limitErrorReply(
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

export function previewFailure(reason: ResolveFailure, error: string): string {
  if (reason === "no_macros") return error;
  return "The coach tried to log a meal it could not identify in your catalog. Ask again naming the item.";
}

const LOG_INTENT =
  /\b(registr\w*|anot\w*|logue\w*|loguear|agreg\w*|a[ñn]ad\w*|sum(?!mar)\w*|carg\w*|log)\b/i;

const CLAIMED_WRITE =
  /\b(registrad[oa]s?|registr[eé]|anotad[oa]s?|a[ñn]adid[oa]s?|agregad[oa]s?|guardad[oa]s?|logged)\b|\b(se procede a|procedo a|voy a)\s+(registrar|anotar|guardar|a[ñn]adir|agregar)/i;

const NOTHING_LOGGED =
  "\n\n(Nothing was logged. The coach did not actually run the log, so check Today and log it from there if you need it.)";

export function unloggedWarning(
  question: string | undefined,
  text: string,
  wrote: boolean,
): string {
  if (wrote || !question) return "";
  if (!LOG_INTENT.test(question)) return "";
  if (!CLAIMED_WRITE.test(text)) return "";
  return NOTHING_LOGGED;
}

export function askOf(question?: string): string {
  return question?.trim()
    ? question.trim()
    : "Give a short read on how today and the week are going, and the next action.";
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

const LEARNED_ADDENDUM_HEAD =
  "You just recorded this about the user, from the message they sent you in this turn:";

const LEARNED_ADDENDUM_TAIL =
  "Open your reply by acknowledging it in one short clause, in the user's language, so they know it was saved. Then answer their message. Take it into account in this very answer: if it is a food preference and the food is not in their catalog, say so and offer to add it, do not just ignore it and suggest something else.";

export function learnedAddendum(facts: string[]): string[] {
  return facts.length
    ? [
        [
          LEARNED_ADDENDUM_HEAD,
          ...facts.map((fact) => `- ${fact}`),
          LEARNED_ADDENDUM_TAIL,
        ].join("\n"),
      ]
    : [];
}
