import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { sha256 } from "@/lib/hash";

const { import_chunks } = schema;

export async function cachedImportChunk(
  userId: string,
  text: string,
): Promise<string | null> {
  const [row] = await db
    .select({ result: import_chunks.result })
    .from(import_chunks)
    .where(
      and(
        eq(import_chunks.user_id, userId),
        eq(import_chunks.chunk_hash, sha256(text)),
      ),
    )
    .limit(1);
  return row?.result ?? null;
}

export async function clearImportChunks(userId: string): Promise<void> {
  await db.delete(import_chunks).where(eq(import_chunks.user_id, userId));
}

export async function saveImportChunk(
  userId: string,
  text: string,
  result: string,
): Promise<void> {
  await db
    .insert(import_chunks)
    .values({
      id: randomUUID(),
      user_id: userId,
      chunk_hash: sha256(text),
      result,
      created_at: new Date(),
    })
    .onConflictDoUpdate({
      target: [import_chunks.user_id, import_chunks.chunk_hash],
      set: { result },
    });
}
