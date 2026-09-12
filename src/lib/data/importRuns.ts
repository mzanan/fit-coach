import "server-only";

import { and, desc, eq, gt, lt } from "drizzle-orm";

import { db, schema } from "@/lib/db";

const { import_runs } = schema;

const RESUMABLE_MS = 24 * 60 * 60 * 1000;

export async function createImportRun(
  userId: string,
  runId: string,
): Promise<void> {
  await db.delete(import_runs).where(eq(import_runs.user_id, userId));
  await db.insert(import_runs).values({
    run_id: runId,
    user_id: userId,
    created_at: new Date(),
  });
}

export async function getImportRun(
  userId: string,
  runId: string,
): Promise<{ runId: string } | null> {
  const [row] = await db
    .select({ runId: import_runs.run_id })
    .from(import_runs)
    .where(and(eq(import_runs.run_id, runId), eq(import_runs.user_id, userId)))
    .limit(1);
  return row ?? null;
}

export async function latestImportRun(
  userId: string,
): Promise<{ runId: string } | null> {
  const [row] = await db
    .select({ runId: import_runs.run_id })
    .from(import_runs)
    .where(
      and(
        eq(import_runs.user_id, userId),
        gt(import_runs.created_at, new Date(Date.now() - RESUMABLE_MS)),
      ),
    )
    .orderBy(desc(import_runs.created_at))
    .limit(1);
  return row ?? null;
}

export async function pruneImportRuns(userId: string): Promise<void> {
  await db
    .delete(import_runs)
    .where(
      and(
        eq(import_runs.user_id, userId),
        lt(import_runs.created_at, new Date(Date.now() - RESUMABLE_MS)),
      ),
    );
}

export async function deleteImportRun(
  userId: string,
  runId: string,
): Promise<void> {
  await db
    .delete(import_runs)
    .where(and(eq(import_runs.run_id, runId), eq(import_runs.user_id, userId)));
}
