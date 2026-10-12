import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";

export async function getUserEmail(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  return row?.email ?? null;
}
