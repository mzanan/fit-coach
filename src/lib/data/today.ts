import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Day, Meal, Profile } from "@/lib/db/schema";
import { resolveDayType, type DayType } from "@/lib/dayType";
import { macroSummary, sumMacros, type MacroLine } from "@/lib/macros";

const { meals, days, routine_slots } = schema;

export interface DayData {
  day: string;
  meals: Meal[];
  totals: { protein_g: number; fat_g: number; carbs_g: number };
  summary: { lines: MacroLine[]; kcal: number; kcalTarget: number };
  isGymDay: boolean;
  dayType: DayType;
  dayRow: Day | null;
}

export async function getDayData(
  userId: string,
  profile: Profile,
  day: string,
): Promise<DayData> {
  const [rows, dayRows, slots] = await Promise.all([
    db
      .select()
      .from(meals)
      .where(and(eq(meals.user_id, userId), eq(meals.logical_day, day)))
      .orderBy(asc(meals.created_at)),
    db
      .select()
      .from(days)
      .where(and(eq(days.user_id, userId), eq(days.logical_day, day)))
      .limit(1),
    db
      .select({ weekday: routine_slots.weekday })
      .from(routine_slots)
      .where(eq(routine_slots.user_id, userId)),
  ]);

  const dayRow = dayRows[0] ?? null;
  const totals = sumMacros(rows);
  const dayType = resolveDayType({ dayRow, slots, day });
  const isGymDay = dayType === "gym";
  const summary = macroSummary(totals, profile, isGymDay);
  return { day, meals: rows, totals, summary, isGymDay, dayType, dayRow };
}
