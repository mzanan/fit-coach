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

export async function listUserIds(): Promise<string[]> {
  const rows = await authDb.select({ id: schema.user.id }).from(schema.user);
  return rows.map((row) => row.id);
}
