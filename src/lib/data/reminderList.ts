import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { newId } from "@/lib/utils";

const { reminders } = schema;

export interface ReminderInput {
  kind: string;
  text: string;
  due_on: string | null;
}

export type ReminderPatch = Partial<ReminderInput> & { done_on?: string | null };

const reminderColumns = {
  id: reminders.id,
  kind: reminders.kind,
  text: reminders.text,
  due_on: reminders.due_on,
  done_on: reminders.done_on,
};

export async function listReminders(userId: string, includeDone: boolean, limit: number) {
  const owned = eq(reminders.user_id, userId);
  return db
    .select(reminderColumns)
    .from(reminders)
    .where(includeDone ? owned : and(owned, isNull(reminders.done_on)))
    .orderBy(
      asc(sql`${reminders.done_on} is not null`),
      desc(reminders.done_on),
      asc(sql`coalesce(${reminders.due_on}, '9999-12-31')`),
      desc(reminders.created_at),
    )
    .limit(limit);
}

export async function addReminder(userId: string, input: ReminderInput) {
  const now = new Date();
  const [saved] = await db
    .insert(reminders)
    .values({ id: newId(), user_id: userId, ...input, created_at: now, updated_at: now })
    .returning(reminderColumns);
  return saved;
}

export async function updateReminder(userId: string, id: string, patch: ReminderPatch) {
  const [saved] = await db
    .update(reminders)
    .set({ ...patch, updated_at: new Date() })
    .where(and(eq(reminders.user_id, userId), eq(reminders.id, id)))
    .returning(reminderColumns);
  return saved ?? null;
}

export async function markReminderDone(userId: string, id: string, day: string) {
  const [saved] = await db
    .update(reminders)
    .set({ done_on: sql`coalesce(${reminders.done_on}, ${day})`, updated_at: new Date() })
    .where(and(eq(reminders.user_id, userId), eq(reminders.id, id)))
    .returning(reminderColumns);
  return saved ?? null;
}

export async function deleteReminder(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(reminders)
    .where(and(eq(reminders.user_id, userId), eq(reminders.id, id)))
    .returning({ id: reminders.id });
  return deleted.length > 0;
}
