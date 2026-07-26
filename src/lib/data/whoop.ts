import "server-only";

import { and, desc, eq, gte } from "drizzle-orm";

import { db, schema } from "@/lib/db";

const { whoop_cycles, whoop_recovery, whoop_sleep, whoop_workouts } = schema;

export interface WhoopSnapshot {
  recovery: typeof whoop_recovery.$inferSelect | null;
  sleep: typeof whoop_sleep.$inferSelect | null;
  cycle: typeof whoop_cycles.$inferSelect | null;
  recentWorkouts: (typeof whoop_workouts.$inferSelect)[];
}

export async function getWhoopSnapshot(userId: string): Promise<WhoopSnapshot> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [recovery] = await db
    .select()
    .from(whoop_recovery)
    .where(eq(whoop_recovery.user_id, userId))
    .orderBy(desc(whoop_recovery.recorded_at))
    .limit(1);

  const [sleep] = await db
    .select()
    .from(whoop_sleep)
    .where(and(eq(whoop_sleep.user_id, userId), eq(whoop_sleep.nap, false)))
    .orderBy(desc(whoop_sleep.end))
    .limit(1);

  const [cycle] = await db
    .select()
    .from(whoop_cycles)
    .where(eq(whoop_cycles.user_id, userId))
    .orderBy(desc(whoop_cycles.start))
    .limit(1);

  const recentWorkouts = await db
    .select()
    .from(whoop_workouts)
    .where(
      and(eq(whoop_workouts.user_id, userId), gte(whoop_workouts.start, weekAgo)),
    )
    .orderBy(desc(whoop_workouts.start));

  return {
    recovery: recovery ?? null,
    sleep: sleep ?? null,
    cycle: cycle ?? null,
    recentWorkouts,
  };
}
