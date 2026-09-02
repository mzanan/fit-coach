import "server-only";

import { and, eq, gte, lte } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Day, Profile } from "@/lib/db/schema";
import { resolveDayType } from "@/lib/dayType";
import { newId } from "@/lib/utils";

const { days, routine_slots } = schema;

export type DaysExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function getDay(
  userId: string,
  day: string,
  executor: DaysExecutor = db,
): Promise<Day | null> {
  const [row] = await executor
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
  executor: DaysExecutor = db,
): Promise<Day> {
  const existing = await getDay(userId, day, executor);
  if (existing) return existing;

  const slots = await executor
    .select({ weekday: routine_slots.weekday })
    .from(routine_slots)
    .where(eq(routine_slots.user_id, userId));

  const dayType = resolveDayType({ dayRow: null, slots, day });

  await executor
    .insert(days)
    .values({
      id: newId(),
      user_id: userId,
      logical_day: day,
      day_type: dayType,
      created_at: new Date(),
    })
    .onConflictDoNothing();

  const row = await getDay(userId, day, executor);
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
  executor: DaysExecutor = db,
): Promise<void> {
  await executor
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
  executor: DaysExecutor = db,
): Promise<void> {
  await executor
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
  return db.transaction(async (tx) => {
    const existing = await ensureDay(userId, profile, day, tx);
    if (existing.closed_at) {
      await updateDay(userId, day, input, tx);
    } else {
      await closeDay(userId, day, input, tx);
    }
    const row = await getDay(userId, day, tx);
    if (!row) throw new Error("Failed to close day");
    return row;
  });
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
