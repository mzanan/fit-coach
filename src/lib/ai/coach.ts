import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { getDayData } from "@/lib/data/today";
import { db, schema } from "@/lib/db";
import type { Profile } from "@/lib/db/schema";
import { dayConfig, shiftDay, todayLogicalDay } from "@/lib/dates";
import { chat, hasAi } from "@/lib/ai/groq";
import { round } from "@/lib/utils";

const { meals } = schema;

const SYSTEM = `You are a strength and nutrition coach inside a personal tracking app. The user is doing body recomposition (gain muscle, lose fat) and mostly eats out. Real progress = photo every 4 weeks + waist, not the scale.

Coaching rules, follow them strictly:
- Protein is the priority. Warn clearly if protein is low; that hurts muscle.
- Fat is a target range and a floor, not a ceiling. Do NOT praise going low on fat. Warn if fat is below the floor (sustained low fat is bad for hormones and muscle) or far above the range.
- A calorie deficit drives fat loss. A one-off high-fat day with calories in range is fine: do not alarm about it.
- Be direct and concrete, no hype, no alarmism, no emoji. Give one or two specific next actions (e.g. what to add to hit protein). Keep it under 130 words. Never use em dashes.`;

interface CoachContext {
  profile: Profile;
  today: string;
  todayLine: string;
  weekLine: string;
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
      fat_g: meals.fat_g,
      carbs_g: meals.carbs_g,
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

  const t = dayData.totals;
  const todayLine = `Today (${today}, ${
    dayData.isGymDay ? "gym" : "rest"
  } day): protein ${round(t.protein_g)}g, fat ${round(t.fat_g)}g, carbs ${round(
    t.carbs_g,
  )}g, calories ${round(dayData.summary.kcal)}. Targets: protein ${
    profile.protein_target
  }g, fat ${profile.fat_min}-${profile.fat_max}g (floor ${
    profile.fat_floor
  }g), calories ${profile.calories_target}.`;
  const weekLine = `Last 7 days: ${loggedDays} days logged, protein target hit on ${proteinHit}.`;

  return { profile, today, todayLine, weekLine };
}

function deterministicReply(ctx: CoachContext): string {
  const lines = [ctx.todayLine, ctx.weekLine];
  return `Set GROQ_API_KEY for full coaching. Snapshot:\n${lines.join("\n")}`;
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

  const userMsg = [
    ctx.todayLine,
    ctx.weekLine,
    question?.trim()
      ? `User question: ${question.trim()}`
      : "Give a short read on how today and the week are going, and the next action.",
  ].join("\n");

  try {
    const text = await chat([
      { role: "system", content: SYSTEM },
      { role: "user", content: userMsg },
    ]);
    return { text: text || deterministicReply(ctx), generated: Boolean(text) };
  } catch {
    return { text: deterministicReply(ctx), generated: false };
  }
}
