import "server-only";

import { and, eq } from "drizzle-orm";
import type { ModelMessage } from "ai";

import { db, schema } from "@/lib/db";
import type { SizeVariant } from "@/lib/catalogMeal";

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
  itemId: string;
  variants: SizeVariant[];
  toolCallId: string;
}

export interface PendingWrite {
  approvalId: string;
  approvalIds: string[];
  question: string | null;
  messages: ModelMessage[];
  previews: PendingPreview[];
}

function toRow(userId: string, pending: PendingWrite) {
  return {
    user_id: userId,
    approval_id: pending.approvalId,
    question: pending.question,
    messages: JSON.stringify({
      messages: pending.messages,
      approvalIds: pending.approvalIds,
    }),
    preview: JSON.stringify(pending.previews),
    created_at: new Date(),
  };
}

export async function savePendingWrite(
  userId: string,
  pending: PendingWrite,
): Promise<void> {
  const row = toRow(userId, pending);
  await db
    .insert(coach_pending_writes)
    .values(row)
    .onConflictDoUpdate({ target: coach_pending_writes.user_id, set: row });
}

function parsePreviews(raw: string): PendingPreview[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingPreview[]) : null;
  } catch {
    return null;
  }
}

function parseMessages(
  raw: string,
): { messages: ModelMessage[]; approvalIds: string[] } | null {
  try {
    const parsed = JSON.parse(raw) as {
      messages?: ModelMessage[];
      approvalIds?: string[];
    };
    if (!Array.isArray(parsed.messages)) return null;
    return {
      messages: parsed.messages,
      approvalIds: Array.isArray(parsed.approvalIds) ? parsed.approvalIds : [],
    };
  } catch {
    return null;
  }
}

export async function getPendingPreview(userId: string): Promise<{
  approvalId: string;
  previews: PendingPreview[];
  question: string | null;
} | null> {
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

  const previews = parsePreviews(row.preview);
  if (!previews) return null;

  return {
    approvalId: row.approval_id,
    question: row.question,
    previews,
  };
}

export async function takePendingWrite(
  userId: string,
  approvalId: string,
): Promise<PendingWrite | null> {
  const [row] = await db
    .delete(coach_pending_writes)
    .where(
      and(
        eq(coach_pending_writes.user_id, userId),
        eq(coach_pending_writes.approval_id, approvalId),
      ),
    )
    .returning();
  if (!row) return null;

  const parsed = parseMessages(row.messages);
  const previews = parsePreviews(row.preview);
  if (!parsed || !previews?.length) return null;

  return {
    approvalId: row.approval_id,
    approvalIds: parsed.approvalIds.length
      ? parsed.approvalIds
      : [row.approval_id],
    question: row.question,
    messages: parsed.messages,
    previews,
  };
}

export async function clearPendingWrite(userId: string): Promise<void> {
  await db
    .delete(coach_pending_writes)
    .where(eq(coach_pending_writes.user_id, userId));
}
