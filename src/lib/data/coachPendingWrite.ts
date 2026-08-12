import "server-only";

import { and, eq } from "drizzle-orm";
import type { ModelMessage } from "ai";

import { db, schema } from "@/lib/db";
import type { SizeVariant } from "@/lib/catalogMeal";
import type {
  FATIGUE_TOOL,
  MEASUREMENT_TOOL,
  RULE_TOOL,
  WORKOUT_TOOL,
  WRITE_TOOL,
} from "@/lib/constants";

const { coach_pending_writes } = schema;

export interface LogMealPreview {
  toolName: typeof WRITE_TOOL;
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

export interface UpdateRulePreview {
  toolName: typeof RULE_TOOL;
  key: string;
  oldValue: string | null;
  newValue: string;
  toolCallId: string;
}

export interface LogFatiguePreview {
  toolName: typeof FATIGUE_TOOL;
  day: string;
  timeOfDay: string;
  score: number | null;
  sleepHours: number | null;
  sleepLocation: string | null;
  previousScore: number | null;
  toolCallId: string;
}

export interface LogWorkoutSessionPreview {
  toolName: typeof WORKOUT_TOOL;
  day: string;
  label: string;
  exercises: {
    name: string;
    sets: { reps: number | null; weight: number | null; per_side: boolean }[];
  }[];
  toolCallId: string;
}

export interface LogMeasurementPreview {
  toolName: typeof MEASUREMENT_TOOL;
  day: string;
  type: string;
  value: number | null;
  previousValue: number | null;
  toolCallId: string;
}

export type PendingPreview =
  | LogMealPreview
  | UpdateRulePreview
  | LogFatiguePreview
  | LogWorkoutSessionPreview
  | LogMeasurementPreview;

export interface PendingWrite {
  approvalId: string;
  approvalIds: string[];
  question: string | null;
  appGenerated: boolean;
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
      appGenerated: pending.appGenerated,
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

function parseMessages(raw: string): {
  messages: ModelMessage[];
  approvalIds: string[];
  appGenerated: boolean;
} | null {
  try {
    const parsed = JSON.parse(raw) as {
      messages?: ModelMessage[];
      approvalIds?: string[];
      appGenerated?: boolean;
    };
    if (!Array.isArray(parsed.messages)) return null;
    return {
      messages: parsed.messages,
      approvalIds: Array.isArray(parsed.approvalIds) ? parsed.approvalIds : [],
      appGenerated: parsed.appGenerated === true,
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
    appGenerated: parsed.appGenerated,
    messages: parsed.messages,
    previews,
  };
}

export async function clearPendingWrite(userId: string): Promise<void> {
  await db
    .delete(coach_pending_writes)
    .where(eq(coach_pending_writes.user_id, userId));
}
