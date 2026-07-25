import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Meal, Profile } from "@/lib/db/schema";
import { isGymWeekday } from "@/lib/dates";
import { macroSummary, sumMacros, type MacroLine } from "@/lib/macros";

const { meals } = schema;

export interface DayData {
  day: string;
  meals: Meal[];
  totals: { protein_g: number; fat_g: number; carbs_g: number };
  summary: { lines: MacroLine[]; kcal: number; kcalTarget: number };
  isGymDay: boolean;
}

export async function getDayData(
  userId: string,
  profile: Profile,
  day: string,
): Promise<DayData> {
  const rows = await db
    .select()
    .from(meals)
    .where(and(eq(meals.user_id, userId), eq(meals.logical_day, day)))
    .orderBy(asc(meals.created_at));

  const totals = sumMacros(rows);
  const isGymDay = isGymWeekday(day);
  const summary = macroSummary(totals, profile, isGymDay);
  return { day, meals: rows, totals, summary, isGymDay };
}
