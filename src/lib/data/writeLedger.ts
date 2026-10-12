import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { WriteSource } from "@/lib/db/context";

export interface LedgerRowInput {
  id: string;
  userId: string;
  source: WriteSource;
  tool: string;
  input: unknown;
}

export async function insertLedgerClaim(row: LedgerRowInput, key: string): Promise<boolean> {
  const claimed = await db
    .insert(schema.write_ledger)
    .values({
      id: row.id,
      user_id: row.userId,
      source: row.source,
      tool: row.tool,
      idempotency_key: key,
      input: row.input,
    })
    .onConflictDoNothing()
    .returning({ id: schema.write_ledger.id });
  return claimed.length > 0;
}

export async function findLedgerByKey(userId: string, key: string) {
  const [existing] = await db
    .select()
    .from(schema.write_ledger)
    .where(and(eq(schema.write_ledger.user_id, userId), eq(schema.write_ledger.idempotency_key, key)))
    .limit(1);
  return existing ?? null;
}

export async function deleteLedgerRow(ledgerId: string) {
  await db.delete(schema.write_ledger).where(eq(schema.write_ledger.id, ledgerId));
}

export async function completeLedgerRow(ledgerId: string, receipt: unknown) {
  await db
    .update(schema.write_ledger)
    .set({ receipt, completed_at: new Date() })
    .where(eq(schema.write_ledger.id, ledgerId));
}

export async function insertLedgerIfChanged(row: LedgerRowInput, receipt: unknown) {
  await db.execute(sql`
    insert into write_ledger (id, user_id, source, tool, input, receipt, completed_at)
    select ${row.id}::uuid, ${row.userId}, ${row.source}, ${row.tool},
      ${JSON.stringify(row.input ?? null)}::jsonb, ${JSON.stringify(receipt ?? null)}::jsonb, now()
    where exists (select 1 from write_changes where ledger_id = ${row.id}::uuid)
  `);
}
