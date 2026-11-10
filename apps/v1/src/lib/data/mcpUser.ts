import "server-only";

import { eq } from "drizzle-orm";

import { authDb, schema } from "@/lib/db";

export async function getUserEmail(userId: string): Promise<string | null> {
  const [row] = await authDb
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  return row?.email ?? null;
}
