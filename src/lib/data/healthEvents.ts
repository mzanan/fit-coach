import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { newId } from "@/lib/utils";

const { health_events } = schema;

export interface HealthEventInput {
  kind: string;
  title: string;
  details: string | null;
  started_on: string;
  resolved_on: string | null;
}

export type HealthEventPatch = Partial<HealthEventInput>;

const eventColumns = {
  id: health_events.id,
  kind: health_events.kind,
  title: health_events.title,
  details: health_events.details,
  started_on: health_events.started_on,
  resolved_on: health_events.resolved_on,
};

export async function listHealthEvents(userId: string, includeResolved: boolean, limit: number) {
  const owned = eq(health_events.user_id, userId);
  return db
    .select(eventColumns)
    .from(health_events)
    .where(includeResolved ? owned : and(owned, isNull(health_events.resolved_on)))
    .orderBy(desc(health_events.started_on))
    .limit(limit);
}

export async function getHealthEvent(userId: string, id: string) {
  const [event] = await db
    .select(eventColumns)
    .from(health_events)
    .where(and(eq(health_events.user_id, userId), eq(health_events.id, id)))
    .limit(1);
  return event ?? null;
}

export async function logHealthEvent(userId: string, input: HealthEventInput) {
  const now = new Date();
  const [saved] = await db
    .insert(health_events)
    .values({ id: newId(), user_id: userId, ...input, created_at: now, updated_at: now })
    .returning(eventColumns);
  return saved;
}

export async function updateHealthEvent(userId: string, id: string, patch: HealthEventPatch) {
  const [saved] = await db
    .update(health_events)
    .set({ ...patch, updated_at: new Date() })
    .where(and(eq(health_events.user_id, userId), eq(health_events.id, id)))
    .returning(eventColumns);
  return saved ?? null;
}

export async function deleteHealthEvent(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(health_events)
    .where(and(eq(health_events.user_id, userId), eq(health_events.id, id)))
    .returning({ id: health_events.id });
  return deleted.length > 0;
}
