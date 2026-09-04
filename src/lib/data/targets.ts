import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Targets } from "@/lib/targets";

const { profiles } = schema;

export async function saveTargets(userId: string, targets: Targets): Promise<void> {
  await db
    .update(profiles)
    .set({ ...targets, updated_at: new Date() })
    .where(eq(profiles.user_id, userId));
}
