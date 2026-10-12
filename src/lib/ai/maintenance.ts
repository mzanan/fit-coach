import "server-only";

import { and, eq, lt, ne } from "drizzle-orm";

import { buildContext } from "@/lib/ai/coachContext";
import { listActiveFacts } from "@/lib/ai/facts";
import { consolidateMemory, getCoachMemory } from "@/lib/ai/memory";
import { userModelRef } from "@/lib/ai/aiCredentials";
import { logAiEvent, pruneAiEvents } from "@/lib/data/aiEvents";
import { applyDuePlans } from "@/lib/data/plans";
import { listUserIds } from "@/lib/data/users";
import { db, schema } from "@/lib/db";
import { runAsUser } from "@/lib/db/context";

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
      await logAiEvent(profile.user_id, "cron_maintenance", {
        provider: ref.provider,
        model: ref.model,
        detail: ok ? "memory consolidated" : "memory consolidation skipped",
      });
    } catch (err) {
      await logAiEvent(profile.user_id, "cron_maintenance", {
        provider: ref.provider,
        model: ref.model,
        detail: "memory consolidation failed",
      });
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

export async function pruneEvents(): Promise<{ deleted: number }> {
  return pruneAiEvents();
}

export async function runMaintenanceForAllUsers() {
  const users = await listUserIds();
  const totals = { users: users.length, facts: 0, consolidated: 0, skipped: 0, events: 0, plans: 0, failed: 0 };
  for (const userId of users) {
    try {
      await runAsUser(userId, "cron", async () => {
        const facts = await expireStaleFacts();
        const memory = await consolidateMemories();
        const events = await pruneEvents();
        totals.plans += await applyDuePlans();
        totals.facts += facts.deactivated;
        totals.consolidated += memory.consolidated;
        totals.skipped += memory.skipped;
        totals.events += events.deleted;
      });
    } catch (error) {
      totals.failed += 1;
      console.error("maintenance: user run failed", userId, error instanceof Error ? error.message : error);
    }
  }
  return totals;
}
