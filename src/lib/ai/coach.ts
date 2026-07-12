import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { getDayData } from "@/lib/data/today";
import { db, schema } from "@/lib/db";
import type { Profile } from "@/lib/db/schema";
import { dayConfig, shiftDay, todayLogicalDay } from "@/lib/dates";
import { chat, hasAi } from "@/lib/ai/groq";
import { getCoachMemory, refreshCoachMemory } from "@/lib/ai/memory";
import { categoryLabel } from "@/lib/constants";
import { kcalOf } from "@/lib/macros";
import { round } from "@/lib/utils";

const { meals } = schema;

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

  return {
    profile,
    today,
    lines: [targetsLine, totalsLine, "Meals logged today:", ...mealLines, weekLine],
  };
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

  const memory = await getCoachMemory(userId);
  const userMsg = [
    ...(memory ? [`Coach memory about this user:\n${memory}`] : []),
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
      await refreshCoachMemory(
        userId,
        memory,
        `${ctx.lines.join("\n")}\nUser: ${question?.trim() || "(daily check-in)"}\nCoach: ${text}`,
      );
    }
    return { text: text || deterministicReply(ctx), generated: Boolean(text) };
  } catch {
    return { text: deterministicReply(ctx), generated: false };
  }
}
