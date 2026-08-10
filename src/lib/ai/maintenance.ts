import "server-only";

import { and, eq, lt, ne } from "drizzle-orm";

import { buildContext } from "@/lib/ai/coach";
import { listActiveFacts } from "@/lib/ai/facts";
import { consolidateMemory, getCoachMemory } from "@/lib/ai/memory";
import { userModelRef } from "@/lib/ai/providers";
import { db, schema } from "@/lib/db";

const { coach_facts, profiles } = schema;

const STALE_FACT_DAYS = 30;
const STALE_FACT_MS = STALE_FACT_DAYS * 24 * 60 * 60 * 1000;
const CONSOLIDATE_TIMEOUT_MS = 60_000;

export async function expireStaleFacts(): Promise<{ deactivated: number }> {
  const cutoff = new Date(Date.now() - STALE_FACT_MS);
  const now = new Date();

  try {
    const deactivated = await db
      .update(coach_facts)
      .set({ active: false, updated_at: now })
      .where(
        and(
          eq(coach_facts.active, true),
          lt(coach_facts.updated_at, cutoff),
          ne(coach_facts.category, "correction"),
        ),
      )
      .returning({ id: coach_facts.id });

    return { deactivated: deactivated.length };
  } catch (err) {
    console.error(
      "maintenance: expireStaleFacts failed",
      err instanceof Error ? err.message : err,
    );
    return { deactivated: 0 };
  }
}

export async function consolidateMemories(): Promise<{
  consolidated: number;
  skipped: number;
}> {
  const rows = await db.select().from(profiles);
  let consolidated = 0;
  let skipped = 0;

  for (const profile of rows) {
    const ref = await userModelRef(profile.user_id);
    if (!ref) {
      skipped++;
      continue;
    }

    try {
      const [previous, facts, ctx] = await Promise.all([
        getCoachMemory(profile.user_id),
        listActiveFacts(profile.user_id),
        buildContext(profile.user_id, profile),
      ]);
      const ok = await consolidateMemory(
        ref,
        profile.user_id,
        previous,
        facts,
        ctx.lines,
        AbortSignal.timeout(CONSOLIDATE_TIMEOUT_MS),
      );
      if (ok) consolidated++;
      else skipped++;
    } catch (err) {
      console.error(
        "maintenance: consolidateMemories failed for user",
        profile.user_id,
        err instanceof Error ? err.message : err,
      );
      skipped++;
    }
  }

  return { consolidated, skipped };
}
