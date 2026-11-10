import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { newId } from "@/lib/utils";

const { pending_items } = schema;

export interface PendingItemInput {
  kind: string;
  text: string;
  due_on: string | null;
}

export type PendingItemPatch = Partial<PendingItemInput> & { done_on?: string | null };

const pendingItemColumns = {
  id: pending_items.id,
  kind: pending_items.kind,
  text: pending_items.text,
  due_on: pending_items.due_on,
  done_on: pending_items.done_on,
};

export async function listPendingItems(userId: string, includeDone: boolean, limit: number) {
  const owned = eq(pending_items.user_id, userId);
  return db
    .select(pendingItemColumns)
    .from(pending_items)
    .where(includeDone ? owned : and(owned, isNull(pending_items.done_on)))
    .orderBy(
      asc(sql`${pending_items.done_on} is not null`),
      desc(pending_items.done_on),
      asc(sql`coalesce(${pending_items.due_on}, '9999-12-31')`),
      desc(pending_items.created_at),
    )
    .limit(limit);
}

export async function addPendingItem(userId: string, input: PendingItemInput) {
  const now = new Date();
  const [saved] = await db
    .insert(pending_items)
    .values({ id: newId(), user_id: userId, ...input, created_at: now, updated_at: now })
    .returning(pendingItemColumns);
  return saved;
}

export async function updatePendingItem(userId: string, id: string, patch: PendingItemPatch) {
  const [saved] = await db
    .update(pending_items)
    .set({ ...patch, updated_at: new Date() })
    .where(and(eq(pending_items.user_id, userId), eq(pending_items.id, id)))
    .returning(pendingItemColumns);
  return saved ?? null;
}

export async function markPendingItemDone(userId: string, id: string, day: string) {
  const [saved] = await db
    .update(pending_items)
    .set({ done_on: sql`coalesce(${pending_items.done_on}, ${day})`, updated_at: new Date() })
    .where(and(eq(pending_items.user_id, userId), eq(pending_items.id, id)))
    .returning(pendingItemColumns);
  return saved ?? null;
}

export async function deletePendingItem(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(pending_items)
    .where(and(eq(pending_items.user_id, userId), eq(pending_items.id, id)))
    .returning({ id: pending_items.id });
  return deleted.length > 0;
}
