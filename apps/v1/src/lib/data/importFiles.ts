import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, lt, max } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { sha256 } from "@/lib/hash";

const { import_files } = schema;

export const STALE_IMPORT_MS = 10 * 60 * 1000;

export interface ImportFileStatus {
  name: string;
  status: "processing" | "done" | "error";
  chunkIndex: number;
  chunkTotal: number;
  error: string | null;
  createdAt: number;
  startedAt: number;
  updatedAt: number;
}

function toStatus(row: typeof import_files.$inferSelect): ImportFileStatus {
  return {
    name: row.name,
    status: row.status,
    chunkIndex: row.chunk_index,
    chunkTotal: row.chunk_total,
    error: row.error,
    createdAt: row.created_at.getTime(),
    startedAt: row.started_at.getTime(),
    updatedAt: row.updated_at.getTime(),
  };
}

export async function startImportFile(
  userId: string,
  name: string,
  chunkTotal: number,
  text: string,
): Promise<void> {
  const textHash = sha256(text);
  const now = new Date();
  await db
    .insert(import_files)
    .values({
      id: randomUUID(),
      user_id: userId,
      name,
      status: "processing",
      chunk_index: 0,
      chunk_total: chunkTotal,
      error: null,
      text_hash: textHash,
      result: null,
      created_at: now,
      started_at: now,
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: [import_files.user_id, import_files.name],
      set: {
        status: "processing",
        chunk_index: 0,
        chunk_total: chunkTotal,
        error: null,
        text_hash: textHash,
        result: null,
        started_at: now,
        updated_at: now,
      },
    });
}

export async function cachedImportFile(
  userId: string,
  name: string,
  text: string,
): Promise<string | null> {
  const textHash = sha256(text);
  const [row] = await db
    .select({ result: import_files.result })
    .from(import_files)
    .where(
      and(
        eq(import_files.user_id, userId),
        eq(import_files.name, name),
        eq(import_files.status, "done"),
        eq(import_files.text_hash, textHash),
      ),
    )
    .limit(1);
  return row?.result ?? null;
}

export async function progressImportFile(
  userId: string,
  name: string,
  chunkIndex: number,
): Promise<void> {
  await db
    .update(import_files)
    .set({ chunk_index: chunkIndex, error: null, updated_at: new Date() })
    .where(and(eq(import_files.user_id, userId), eq(import_files.name, name)));
}

export async function touchImportFile(
  userId: string,
  name: string,
): Promise<void> {
  await db
    .update(import_files)
    .set({ updated_at: new Date() })
    .where(
      and(
        eq(import_files.user_id, userId),
        eq(import_files.name, name),
        eq(import_files.status, "processing"),
      ),
    );
}

export async function latestImportActivity(
  userId: string,
): Promise<number | null> {
  const [row] = await db
    .select({ latest: max(import_files.updated_at) })
    .from(import_files)
    .where(eq(import_files.user_id, userId));
  return row?.latest ? row.latest.getTime() : null;
}

export async function noteImportFileRetry(
  userId: string,
  name: string,
  note: string,
): Promise<void> {
  await db
    .update(import_files)
    .set({ error: note, updated_at: new Date() })
    .where(
      and(
        eq(import_files.user_id, userId),
        eq(import_files.name, name),
        eq(import_files.status, "processing"),
      ),
    );
}

export async function finishImportFile(
  userId: string,
  name: string,
  error: string | null,
  result: string | null,
): Promise<void> {
  await db
    .update(import_files)
    .set({
      status: error ? "error" : "done",
      error,
      result,
      updated_at: new Date(),
    })
    .where(and(eq(import_files.user_id, userId), eq(import_files.name, name)));
}

export async function failProcessingImportFiles(
  userId: string,
  reason: string,
): Promise<void> {
  await db
    .update(import_files)
    .set({ status: "error", error: reason, updated_at: new Date() })
    .where(
      and(
        eq(import_files.user_id, userId),
        eq(import_files.status, "processing"),
      ),
    );
}

export async function failStaleImportFiles(
  userId: string,
  reason: string,
): Promise<void> {
  await db
    .update(import_files)
    .set({ status: "error", error: reason, updated_at: new Date() })
    .where(
      and(
        eq(import_files.user_id, userId),
        eq(import_files.status, "processing"),
        lt(import_files.updated_at, new Date(Date.now() - STALE_IMPORT_MS)),
      ),
    );
}

export async function clearImportFiles(userId: string): Promise<void> {
  await db.delete(import_files).where(eq(import_files.user_id, userId));
}

export async function savedImportResults(userId: string): Promise<string[]> {
  const rows = await db
    .select({ result: import_files.result })
    .from(import_files)
    .where(
      and(eq(import_files.user_id, userId), eq(import_files.status, "done")),
    )
    .orderBy(import_files.created_at);
  return rows.flatMap((row) => (row.result ? [row.result] : []));
}

export async function listImportFiles(
  userId: string,
): Promise<ImportFileStatus[]> {
  const rows = await db
    .select()
    .from(import_files)
    .where(eq(import_files.user_id, userId))
    .orderBy(desc(import_files.updated_at));
  return rows.map(toStatus);
}
