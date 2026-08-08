import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import type { DaySummary } from "@/lib/ai/coach";
import { db, schema } from "@/lib/db";
import { newId } from "@/lib/utils";

const { coach_messages } = schema;

export const HISTORY_TURNS = 12;

export type CoachMessageStatus = "done" | "stopped" | "streaming";

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  generated: boolean;
  status: CoachMessageStatus;
  created_at: Date;
  daySummary?: DaySummary;
}

export interface ExchangeRef {
  userId: string;
  ids: string[];
  assistantId: string;
}

function toRole(value: string): "user" | "assistant" {
  return value === "user" ? "user" : "assistant";
}

function toStatus(value: string): CoachMessageStatus {
  if (value === "stopped" || value === "streaming") return value;
  return "done";
}

function parseDaySummary(raw: string | null): DaySummary | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as DaySummary;
  } catch {
    return undefined;
  }
}

export async function getConversation(
  userId: string,
  limit = HISTORY_TURNS,
): Promise<CoachMessage[]> {
  const rows = await db
    .select()
    .from(coach_messages)
    .where(
      and(
        eq(coach_messages.user_id, userId),
        eq(coach_messages.generated, true),
      ),
    )
    .orderBy(desc(coach_messages.created_at))
    .limit(limit);

  return rows
    .map((row) => ({
      id: row.id,
      role: toRole(row.role),
      content: row.content,
      generated: row.generated,
      status: toStatus(row.status),
      created_at: row.created_at,
    }))
    .reverse();
}

export async function getFullConversation(
  userId: string,
): Promise<CoachMessage[]> {
  const rows = await db
    .select()
    .from(coach_messages)
    .where(eq(coach_messages.user_id, userId))
    .orderBy(asc(coach_messages.created_at));

  return rows.map((row) => ({
    id: row.id,
    role: toRole(row.role),
    content: row.content,
    generated: row.generated,
    status: toStatus(row.status),
    created_at: row.created_at,
    daySummary: parseDaySummary(row.day_summary),
  }));
}

export async function appendExchange(
  userId: string,
  question: string | null,
  answer: string,
  generated: boolean,
  daySummary?: DaySummary,
): Promise<void> {
  const now = Date.now();
  const rows = [
    ...(question
      ? [
          {
            id: newId(),
            user_id: userId,
            role: "user",
            content: question,
            generated,
            day_summary: null,
            created_at: new Date(now),
          },
        ]
      : []),
    {
      id: newId(),
      user_id: userId,
      role: "assistant",
      content: answer,
      generated,
      day_summary: daySummary ? JSON.stringify(daySummary) : null,
      created_at: new Date(now + 1),
    },
  ];
  await db.insert(coach_messages).values(rows);
}

export async function beginExchange(
  userId: string,
  question: string | null,
  placeholder: string,
): Promise<ExchangeRef> {
  const now = Date.now();
  const assistantId = newId();
  const questionId = question ? newId() : null;
  const rows = [
    ...(question && questionId
      ? [
          {
            id: questionId,
            user_id: userId,
            role: "user",
            content: question,
            generated: false,
            status: "streaming",
            day_summary: null,
            created_at: new Date(now),
          },
        ]
      : []),
    {
      id: assistantId,
      user_id: userId,
      role: "assistant",
      content: placeholder,
      generated: false,
      status: "streaming",
      day_summary: null,
      created_at: new Date(now + 1),
    },
  ];
  await db.insert(coach_messages).values(rows);
  return {
    userId,
    ids: [...(questionId ? [questionId] : []), assistantId],
    assistantId,
  };
}

export async function finishExchange(
  ref: ExchangeRef,
  answer: string,
  generated: boolean,
  daySummary?: DaySummary,
): Promise<boolean> {
  let finalized = false;
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(coach_messages)
      .set({ generated, status: "done" })
      .where(
        and(
          inArray(coach_messages.id, ref.ids),
          eq(coach_messages.user_id, ref.userId),
          eq(coach_messages.status, "streaming"),
        ),
      )
      .returning({ id: coach_messages.id });
    finalized = updated.length > 0;
    if (!finalized) return;
    await tx
      .update(coach_messages)
      .set({
        content: answer,
        day_summary: daySummary ? JSON.stringify(daySummary) : null,
      })
      .where(
        and(
          eq(coach_messages.id, ref.assistantId),
          eq(coach_messages.user_id, ref.userId),
        ),
      );
  });
  return finalized;
}

export async function updateExchangeContent(
  ref: ExchangeRef,
  content: string,
): Promise<void> {
  await db
    .update(coach_messages)
    .set({ content })
    .where(
      and(
        eq(coach_messages.id, ref.assistantId),
        eq(coach_messages.user_id, ref.userId),
      ),
    );
}

export async function stopExchange(
  userId: string,
  ids: string[],
): Promise<boolean> {
  if (!ids.length) return false;
  const updated = await db
    .update(coach_messages)
    .set({ status: "stopped" })
    .where(
      and(
        inArray(coach_messages.id, ids),
        eq(coach_messages.user_id, userId),
        eq(coach_messages.status, "streaming"),
      ),
    )
    .returning({ id: coach_messages.id });
  return updated.length > 0;
}

export async function getExchangeStatus(
  ref: ExchangeRef,
): Promise<CoachMessageStatus | null> {
  const [row] = await db
    .select({ status: coach_messages.status })
    .from(coach_messages)
    .where(
      and(
        eq(coach_messages.id, ref.assistantId),
        eq(coach_messages.user_id, ref.userId),
      ),
    )
    .limit(1);
  return row ? toStatus(row.status) : null;
}

export async function getMessage(
  userId: string,
  id: string,
): Promise<CoachMessage | null> {
  const [row] = await db
    .select()
    .from(coach_messages)
    .where(and(eq(coach_messages.id, id), eq(coach_messages.user_id, userId)))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    role: toRole(row.role),
    content: row.content,
    generated: row.generated,
    status: toStatus(row.status),
    created_at: row.created_at,
    daySummary: parseDaySummary(row.day_summary),
  };
}

export async function discardExchange(ref: ExchangeRef): Promise<void> {
  await db
    .delete(coach_messages)
    .where(
      and(
        inArray(coach_messages.id, ref.ids),
        eq(coach_messages.user_id, ref.userId),
      ),
    );
}

export async function clearConversation(userId: string): Promise<void> {
  await db.delete(coach_messages).where(eq(coach_messages.user_id, userId));
}
