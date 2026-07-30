import "server-only";

import { eq } from "drizzle-orm";

import { chat } from "@/lib/ai/provider";
import { db, schema } from "@/lib/db";

const { coach_memory } = schema;

const MEMORY_SYSTEM = `You maintain the running memory of a nutrition and strength coach about one user. Merge the previous memory with the new exchange into an updated memory. Keep only durable facts useful for future coaching: habits, recurring patterns, preferences, injuries, adherence trends, decisions made with the user, open questions. Drop day-to-day noise. Plain text, max 150 words, no headings, no em dashes.`;

export async function getCoachMemory(userId: string): Promise<string | null> {
  const rows = await db
    .select({ content: coach_memory.content })
    .from(coach_memory)
    .where(eq(coach_memory.user_id, userId))
    .limit(1);
  return rows[0]?.content ?? null;
}

export async function refreshCoachMemory(
  userId: string,
  previous: string | null,
  exchange: string,
): Promise<void> {
  try {
    const content = await chat(
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
    await db
      .insert(coach_memory)
      .values({ user_id: userId, content, updated_at: new Date() })
      .onConflictDoUpdate({
        target: coach_memory.user_id,
        set: { content, updated_at: new Date() },
      });
  } catch {
    return;
  }
}
