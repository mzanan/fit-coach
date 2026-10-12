import "server-only";

import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { newId } from "@/lib/utils";

const { fatigue_logs } = schema;

export interface FatigueLogRow {
  logical_day: string;
  time_of_day: string;
  score: number | null;
  sleep_hours: number | null;
  sleep_location: string | null;
}

export type FatigueLogInput = FatigueLogRow;

export async function saveFatigueLog(
  userId: string,
  input: FatigueLogInput,
): Promise<void> {
  const now = new Date();
  await db
    .insert(fatigue_logs)
    .values({
      id: newId(),
      user_id: userId,
      logical_day: input.logical_day,
      time_of_day: input.time_of_day,
      score: input.score,
      sleep_hours: input.sleep_hours,
      sleep_location: input.sleep_location,
      created_at: now,
    })
    .onConflictDoUpdate({
      target: [
        fatigue_logs.user_id,
        fatigue_logs.logical_day,
        fatigue_logs.time_of_day,
      ],
      set: {
        score: input.score ?? sql`${fatigue_logs.score}`,
        sleep_hours: input.sleep_hours ?? sql`${fatigue_logs.sleep_hours}`,
        sleep_location:
          input.sleep_location ?? sql`${fatigue_logs.sleep_location}`,
        created_at: now,
      },
    });
}

export async function getDayFatigue(
  userId: string,
  logicalDay: string,
): Promise<FatigueLogRow[]> {
  return db
    .select({
      logical_day: fatigue_logs.logical_day,
      time_of_day: fatigue_logs.time_of_day,
      score: fatigue_logs.score,
      sleep_hours: fatigue_logs.sleep_hours,
      sleep_location: fatigue_logs.sleep_location,
    })
    .from(fatigue_logs)
    .where(
      and(
        eq(fatigue_logs.user_id, userId),
        eq(fatigue_logs.logical_day, logicalDay),
      ),
    );
}

export async function recentFatigueAverage(
  userId: string,
  sinceLogicalDay: string,
): Promise<{ average: number; count: number } | null> {
  const rows = await db
    .select({ score: fatigue_logs.score })
    .from(fatigue_logs)
    .where(
      and(
        eq(fatigue_logs.user_id, userId),
        gte(fatigue_logs.logical_day, sinceLogicalDay),
      ),
    );
  const scored = rows.filter((r): r is { score: number } => r.score != null);
  if (!scored.length) return null;
  const sum = scored.reduce((acc, r) => acc + r.score, 0);
  return { average: sum / scored.length, count: scored.length };
}

export async function deleteFatigueLog(
  userId: string,
  day: string,
  timeOfDay: string,
): Promise<boolean> {
  const deleted = await db
    .delete(fatigue_logs)
    .where(
      and(
        eq(fatigue_logs.user_id, userId),
        eq(fatigue_logs.logical_day, day),
        eq(fatigue_logs.time_of_day, timeOfDay),
      ),
    )
    .returning({ id: fatigue_logs.id });
  return deleted.length > 0;
}

export async function listFatigueLogs(userId: string, limit: number): Promise<FatigueLogRow[]> {
  return db
    .select({
      logical_day: fatigue_logs.logical_day,
      time_of_day: fatigue_logs.time_of_day,
      score: fatigue_logs.score,
      sleep_hours: fatigue_logs.sleep_hours,
      sleep_location: fatigue_logs.sleep_location,
    })
    .from(fatigue_logs)
    .where(eq(fatigue_logs.user_id, userId))
    .orderBy(desc(fatigue_logs.logical_day))
    .limit(limit);
}

export async function writeFatigueLog(userId: string, input: FatigueLogInput): Promise<void> {
  const now = new Date();
  await db
    .insert(fatigue_logs)
    .values({ id: newId(), user_id: userId, ...input, created_at: now })
    .onConflictDoUpdate({
      target: [fatigue_logs.user_id, fatigue_logs.logical_day, fatigue_logs.time_of_day],
      set: {
        score: input.score,
        sleep_hours: input.sleep_hours,
        sleep_location: input.sleep_location,
        created_at: now,
      },
    });
}
