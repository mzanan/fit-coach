import "server-only";

import { eq } from "drizzle-orm";

import { chat } from "@/lib/ai/provider";
import type { ModelRef } from "@/lib/ai/providers";
import { db, schema } from "@/lib/db";

const { coach_memory } = schema;

const MEMORY_SYSTEM = `You maintain the running memory of a nutrition and strength coach about one user. Merge the previous memory with the new exchange into an updated memory. Keep only durable facts useful for future coaching: habits, recurring patterns, preferences, injuries, adherence trends, decisions made with the user, open questions. Drop day-to-day noise. Plain text, max 150 words, no headings, no em dashes.`;

const CONSOLIDATE_SYSTEM = `You maintain the running memory of a nutrition and strength coach about one user. This is a periodic background re-grounding, not a new conversation: keep everything in the existing memory that still matters (habits, recurring patterns, preferences, injuries, adherence trends, decisions made with the user, open questions), and only revise or drop a detail if the current stored facts or recent logged data directly contradict it or make it stale. Never discard something from the existing memory just because it doesn't appear in the facts or recent data, those two sources are incomplete by nature and are only there to catch drift, not to replace conversational nuance. Add anything new the facts or recent data reveal. Plain text, max 150 words, no headings, no em dashes.`;

const CONSOLIDATE_MIN_LENGTH = 20;

export async function getCoachMemory(userId: string): Promise<string | null> {
  const rows = await db
    .select({ content: coach_memory.content })
    .from(coach_memory)
    .where(eq(coach_memory.user_id, userId))
    .limit(1);
  return rows[0]?.content ?? null;
}

async function writeMemory(userId: string, content: string): Promise<void> {
  await db
    .insert(coach_memory)
    .values({ user_id: userId, content, updated_at: new Date() })
    .onConflictDoUpdate({
      target: coach_memory.user_id,
      set: { content, updated_at: new Date() },
    });
}

export async function refreshCoachMemory(
  ref: ModelRef,
  userId: string,
  previous: string | null,
  exchange: string,
): Promise<void> {
  try {
    const content = await chat(
      ref,
      [
        { role: "system", content: MEMORY_SYSTEM },
        {
          role: "user",
          content: `Previous memory:\n${previous ?? "(none)"}\n\nNew exchange:\n${exchange}`,
        },
      ],
      300,
    );
    if (!content) return;
    await writeMemory(userId, content);
  } catch {
    return;
  }
}

export async function consolidateMemory(
  ref: ModelRef,
  userId: string,
  previous: string | null,
  facts: string[],
  contextLines: string[],
): Promise<boolean> {
  try {
    const content = await chat(
      ref,
      [
        { role: "system", content: CONSOLIDATE_SYSTEM },
        {
          role: "user",
          content: `Existing memory:\n${previous ?? "(none)"}\n\nCurrent stored facts:\n${facts.length ? facts.join("\n") : "(none)"}\n\nRecent logged data:\n${contextLines.join("\n")}`,
        },
      ],
      300,
    );
    if (!content || content.trim().length < CONSOLIDATE_MIN_LENGTH) return false;
    await writeMemory(userId, content);
    return true;
  } catch {
    return false;
  }
}
