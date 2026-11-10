import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { recordTargetsEdit } from "@/lib/data/plans";
import { dayConfig, todayLogicalDay } from "@/lib/dates";
import type { Targets } from "@/lib/targets";

const { profiles } = schema;

export async function saveTargets(userId: string, targets: Targets): Promise<void> {
  await db.transaction(async (tx) => {
    const [profile] = await tx
      .update(profiles)
      .set({ ...targets, updated_at: new Date() })
      .where(eq(profiles.user_id, userId))
      .returning();
    if (profile) await recordTargetsEdit(tx, userId, todayLogicalDay(dayConfig(profile)), targets);
  });
}
