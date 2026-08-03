import "server-only";

import { eq } from "drizzle-orm";
import type { ModelMessage } from "ai";

import { db, schema } from "@/lib/db";

const { coach_pending_writes } = schema;

export interface PendingPreview {
  toolName: string;
  category: string;
  name: string;
  place: string | null;
  portions: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  kcal: number;
  day: string;
}

export interface PendingWrite {
  approvalId: string;
  question: string | null;
  messages: ModelMessage[];
  preview: PendingPreview;
}

export async function savePendingWrite(
  userId: string,
  pending: PendingWrite,
): Promise<void> {
  const row = {
    user_id: userId,
    approval_id: pending.approvalId,
    question: pending.question,
    messages: JSON.stringify(pending.messages),
    preview: JSON.stringify(pending.preview),
    created_at: new Date(),
  };
  await db
    .insert(coach_pending_writes)
    .values(row)
    .onConflictDoUpdate({ target: coach_pending_writes.user_id, set: row });
}

export async function getPendingPreview(
  userId: string,
): Promise<{ approvalId: string; preview: PendingPreview; question: string | null } | null> {
  const [row] = await db
    .select({
      approval_id: coach_pending_writes.approval_id,
      question: coach_pending_writes.question,
      preview: coach_pending_writes.preview,
    })
    .from(coach_pending_writes)
    .where(eq(coach_pending_writes.user_id, userId))
    .limit(1);
  if (!row) return null;

  try {
    return {
      approvalId: row.approval_id,
      question: row.question,
      preview: JSON.parse(row.preview) as PendingPreview,
    };
  } catch {
    return null;
  }
}

export async function takePendingWrite(
  userId: string,
  approvalId: string,
): Promise<PendingWrite | null> {
  const [row] = await db
    .select()
    .from(coach_pending_writes)
    .where(eq(coach_pending_writes.user_id, userId))
    .limit(1);
  if (!row || row.approval_id !== approvalId) return null;

  await clearPendingWrite(userId);

  try {
    return {
      approvalId: row.approval_id,
      question: row.question,
      messages: JSON.parse(row.messages) as ModelMessage[],
      preview: JSON.parse(row.preview) as PendingPreview,
    };
  } catch {
    return null;
  }
}

export async function clearPendingWrite(userId: string): Promise<void> {
  await db
    .delete(coach_pending_writes)
    .where(eq(coach_pending_writes.user_id, userId));
}
