import "server-only";

import { and, asc, eq, or, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { newId } from "@/lib/utils";

const { memory_files } = schema;

const fileColumns = {
  id: memory_files.id,
  path: memory_files.path,
  content: memory_files.content,
  version: memory_files.version,
};

export type StoredMemoryFile = {
  id: string;
  path: string;
  content: string;
  version: number;
};

function inFolder(folder: string) {
  return sql`starts_with(${memory_files.path}, ${`${folder}/`}::text)`;
}

export async function listMemoryFiles(userId: string): Promise<StoredMemoryFile[]> {
  return db
    .select(fileColumns)
    .from(memory_files)
    .where(eq(memory_files.user_id, userId))
    .orderBy(asc(memory_files.path));
}

export async function getMemoryFile(userId: string, path: string): Promise<StoredMemoryFile | null> {
  const [file] = await db
    .select(fileColumns)
    .from(memory_files)
    .where(and(eq(memory_files.user_id, userId), eq(memory_files.path, path)))
    .limit(1);
  return file ?? null;
}

export async function insertMemoryFile(userId: string, path: string, content: string): Promise<boolean> {
  const now = new Date();
  const inserted = await db
    .insert(memory_files)
    .values({ id: newId(), user_id: userId, path, content, version: 1, created_at: now, updated_at: now })
    .onConflictDoNothing({ target: [memory_files.user_id, memory_files.path] })
    .returning({ id: memory_files.id });
  return inserted.length > 0;
}

export async function updateMemoryFile(userId: string, file: StoredMemoryFile, content: string): Promise<boolean> {
  const updated = await db
    .update(memory_files)
    .set({ content, version: file.version + 1, updated_at: new Date() })
    .where(and(eq(memory_files.user_id, userId), eq(memory_files.id, file.id), eq(memory_files.version, file.version)))
    .returning({ id: memory_files.id });
  return updated.length > 0;
}

export async function deleteMemoryPath(userId: string, path: string): Promise<number> {
  const deleted = await db
    .delete(memory_files)
    .where(and(eq(memory_files.user_id, userId), or(eq(memory_files.path, path), inFolder(path))))
    .returning({ id: memory_files.id });
  return deleted.length;
}

export async function renameMemoryPath(userId: string, from: string, to: string): Promise<number> {
  const renamed = await db
    .update(memory_files)
    .set({
      path: sql`${to}::text || substr(${memory_files.path}, ${from.length + 1}::int)`,
      version: sql`${memory_files.version} + 1`,
      updated_at: new Date(),
    })
    .where(and(eq(memory_files.user_id, userId), or(eq(memory_files.path, from), inFolder(from))))
    .returning({ id: memory_files.id });
  return renamed.length;
}
