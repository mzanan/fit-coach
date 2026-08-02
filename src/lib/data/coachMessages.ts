import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { newId } from "@/lib/utils";

const { coach_messages } = schema;

export const HISTORY_TURNS = 12;

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  generated: boolean;
  created_at: Date;
}

function toRole(value: string): "user" | "assistant" {
  return value === "user" ? "user" : "assistant";
}

export async function getConversation(
  userId: string,
  limit = HISTORY_TURNS,
): Promise<CoachMessage[]> {
  const rows = await db
    .select()
    .from(coach_messages)
    .where(eq(coach_messages.user_id, userId))
    .orderBy(desc(coach_messages.created_at))
    .limit(limit);

  return rows
    .map((row) => ({
      id: row.id,
      role: toRole(row.role),
      content: row.content,
      generated: row.generated,
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
    created_at: row.created_at,
  }));
}

export async function appendExchange(
  userId: string,
  question: string | null,
  answer: string,
  generated: boolean,
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
            generated: true,
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
      created_at: new Date(now + 1),
    },
  ];
  await db.insert(coach_messages).values(rows);
}

export async function clearConversation(userId: string): Promise<void> {
  await db.delete(coach_messages).where(eq(coach_messages.user_id, userId));
}
