import "server-only";

import { and, eq, lt, ne } from "drizzle-orm";

import { db, schema } from "@/lib/db";

const { coach_facts } = schema;

const STALE_FACT_DAYS = 30;
const STALE_FACT_MS = STALE_FACT_DAYS * 24 * 60 * 60 * 1000;

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
