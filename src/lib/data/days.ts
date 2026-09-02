import "server-only";

import { and, eq, gte, lte } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Day, Profile } from "@/lib/db/schema";
import { resolveDayType } from "@/lib/dayType";
import { newId } from "@/lib/utils";

const { days, routine_slots } = schema;

export async function getDay(userId: string, day: string): Promise<Day | null> {
  const [row] = await db
    .select()
    .from(days)
    .where(and(eq(days.user_id, userId), eq(days.logical_day, day)))
    .limit(1);
  return row ?? null;
}

export async function ensureDay(
  userId: string,
  profile: Profile,
  day: string,
): Promise<Day> {
  const existing = await getDay(userId, day);
  if (existing) return existing;

  const slots = await db
    .select({ weekday: routine_slots.weekday })
    .from(routine_slots)
    .where(eq(routine_slots.user_id, userId));

  const dayType = resolveDayType({ dayRow: null, slots, day });

  await db
    .insert(days)
    .values({
      id: newId(),
      user_id: userId,
      logical_day: day,
      day_type: dayType,
      created_at: new Date(),
    })
    .onConflictDoNothing();

  const row = await getDay(userId, day);
  if (!row) throw new Error("Failed to create day row");
  return row;
}

export interface UpdateDayPatch {
  steps?: number | null;
  notes?: string | null;
  day_type?: string;
}

export async function updateDay(
  userId: string,
  day: string,
  patch: UpdateDayPatch,
): Promise<void> {
  await db
    .update(days)
    .set(patch)
    .where(and(eq(days.user_id, userId), eq(days.logical_day, day)));
}

export interface CloseDayInput {
  steps: number | null;
  notes: string | null;
}

export async function closeDay(
  userId: string,
  day: string,
  input: CloseDayInput,
): Promise<void> {
  await db
    .update(days)
    .set({ steps: input.steps, notes: input.notes, closed_at: new Date() })
    .where(and(eq(days.user_id, userId), eq(days.logical_day, day)));
}

export async function closeOrUpdateDay(
  userId: string,
  profile: Profile,
  day: string,
  input: CloseDayInput,
): Promise<Day> {
  const existing = await ensureDay(userId, profile, day);
  if (existing.closed_at) {
    await updateDay(userId, day, input);
  } else {
    await closeDay(userId, day, input);
  }
  const row = await getDay(userId, day);
  if (!row) throw new Error("Failed to close day");
  return row;
}

export async function getWeekDays(
  userId: string,
  fromDay: string,
  toDay: string,
): Promise<Day[]> {
  return db
    .select()
    .from(days)
    .where(
      and(
        eq(days.user_id, userId),
        gte(days.logical_day, fromDay),
        lte(days.logical_day, toDay),
      ),
    );
}
