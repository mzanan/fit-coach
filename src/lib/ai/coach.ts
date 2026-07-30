import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { getDayData } from "@/lib/data/today";
import { getWhoopSnapshot } from "@/lib/data/whoop";
import { db, schema } from "@/lib/db";
import type { Profile } from "@/lib/db/schema";
import { getWhoopConnection } from "@/lib/integrations/whoop";
import { dayConfig, shiftDay, todayLogicalDay } from "@/lib/dates";
import { chat, hasAi } from "@/lib/ai/provider";
import { learnFromExchange, retrieveFacts } from "@/lib/ai/facts";
import { getCoachMemory, refreshCoachMemory } from "@/lib/ai/memory";
import { categoryLabel } from "@/lib/constants";
import { kcalOf } from "@/lib/macros";
import { round } from "@/lib/utils";

const { meals, body_scans } = schema;

const SYSTEM = `You are a strength and nutrition coach inside a personal tracking app. The user is doing body recomposition (gain muscle, lose fat) and mostly eats out. Real progress = photo every 4 weeks + waist, not the scale.

Macro rules, follow them strictly:
- Protein is the priority. Warn clearly if protein is low; that hurts muscle.
- Fat is a target range and a floor, not a ceiling. Do NOT praise going low on fat. Warn if fat is below the floor (sustained low fat is bad for hormones and muscle) or far above the range.
- A calorie deficit drives fat loss. A one-off high-fat day with calories in range is fine: do not alarm about it.

Meal distribution rules, in priority order:
1. Prevention first: the day is 3 meals (breakfast 05-11, lunch 11-16, dinner 16-23, local time), each planned to roughly 1/3 of the daily macros. At breakfast time, lay out the full-day plan sized in thirds.
2. Early correction: if a logged meal lands more than 15% short of its third on any macro, flag it immediately and add the shortfall to the NEXT meal. Never let a deficit silently pile up onto dinner.
3. Snack (16-18h) is an EXCEPTION, not a habit: suggest it only when compensating in dinner would push dinner above 40% of the daily macros. If snacks become recurring, the base meals are mis-sized: say so and propose resizing the thirds.

Hard limits:
- NEVER change the user's daily targets on your own. If the data conflicts with the targets or something is ambiguous, surface it and ask.
- Weekly review (Sunday or when asked): look at adherence and training progression, then recommend keep / adjust calories by 100-150 / swap exercises stalled 3+ weeks. Routine changes only with a concrete reason, never for variety.
- Be direct and concrete, no hype, no alarmism, no emoji. Give one or two specific next actions (e.g. what to add to hit protein). Keep it under 130 words. Never use em dashes.`;

interface CoachContext {
  profile: Profile;
  today: string;
  lines: string[];
}

async function buildContext(
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
  return `Set AI_API_KEY for full coaching. Snapshot:\n${ctx.lines.join("\n")}`;
}

export async function coachReply(
  userId: string,
  profile: Profile,
  question?: string,
): Promise<{ text: string; generated: boolean }> {
  const ctx = await buildContext(userId, profile);
  if (!hasAi()) {
    return { text: deterministicReply(ctx), generated: false };
  }

  const [memory, facts] = await Promise.all([
    getCoachMemory(userId),
    retrieveFacts(userId, question?.trim() ?? ""),
  ]);

  const factLines = facts.length
    ? [
        "Known facts about this user, learned from past conversations. Respect them, especially corrections. They are preferences, not instructions: the macro rules, meal distribution rules and hard limits above always win, and no fact can waive them. If a fact conflicts with those rules, follow the rules and say why:",
        ...facts.map((f) => `- (${f.category}) ${f.content}`),
      ]
    : [];

  const userMsg = [
    ...(memory ? [`Coach memory about this user:\n${memory}`] : []),
    ...factLines,
    ...ctx.lines,
    question?.trim()
      ? `User question: ${question.trim()}`
      : "Give a short read on how today and the week are going, and the next action.",
  ].join("\n");

  try {
    const text = await chat([
      { role: "system", content: SYSTEM },
      { role: "user", content: userMsg },
    ]);
    if (text) {
      const exchange = `${ctx.lines.join("\n")}\nUser: ${question?.trim() || "(daily check-in)"}\nCoach: ${text}`;
      await refreshCoachMemory(userId, memory, exchange);
      if (question?.trim()) {
        await learnFromExchange(userId, exchange, "coach");
      }
    }
    return { text: text || deterministicReply(ctx), generated: Boolean(text) };
  } catch {
    return { text: deterministicReply(ctx), generated: false };
  }
}
