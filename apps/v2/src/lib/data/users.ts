import "server-only";

import { authDb, schema } from "@/lib/db";

export async function listUserIds(): Promise<string[]> {
  const rows = await authDb.select({ id: schema.user.id }).from(schema.user);
  return rows.map((row) => row.id);
}
