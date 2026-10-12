import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { canonicalJson } from "@/lib/canonicalJson";
import { db, schema } from "@/lib/db";
import { runWithDbContext, type WriteSource } from "@/lib/db/context";

export interface LedgerCall {
  userId: string;
  source: WriteSource;
  tool: string;
  input: unknown;
  idempotencyKey?: string;
}

export type LedgerOutcome<T> = { replayed: true; receipt: unknown } | { replayed: false; result: T };

export class LedgerKeyError extends Error {}

const STALE_CLAIM_MS = 120_000;

function logLedgerFailure(step: string, error: unknown) {
  console.error(`[write-ledger] ${step} failed`, error);
}

async function insertClaim(call: LedgerCall, ledgerId: string, key: string): Promise<boolean> {
  const claimed = await db
    .insert(schema.write_ledger)
    .values({
      id: ledgerId,
      user_id: call.userId,
      source: call.source,
      tool: call.tool,
      idempotency_key: key,
      input: call.input,
    })
    .onConflictDoNothing()
    .returning({ id: schema.write_ledger.id });
  return claimed.length > 0;
}

async function claimKey(call: LedgerCall, ledgerId: string, key: string): Promise<LedgerOutcome<never> | null> {
  if (await insertClaim(call, ledgerId, key)) return null;

  const [existing] = await db
    .select()
    .from(schema.write_ledger)
    .where(and(eq(schema.write_ledger.user_id, call.userId), eq(schema.write_ledger.idempotency_key, key)))
    .limit(1);
  if (!existing) throw new LedgerKeyError(`Could not claim idempotency key ${key}; retry the call.`);
  if (existing.tool !== call.tool || canonicalJson(existing.input) !== canonicalJson(call.input)) {
    throw new LedgerKeyError(
      `Idempotency key ${key} was already used for a different write; use a new key for new or corrected data.`,
    );
  }
  if (existing.completed_at) return { replayed: true, receipt: existing.receipt };
  if (Date.now() - existing.created_at.getTime() < STALE_CLAIM_MS) {
    throw new LedgerKeyError(`A call with idempotency key ${key} is still running; read the data before retrying.`);
  }
  await releaseKey(existing.id);
  if (await insertClaim(call, ledgerId, key)) return null;
  throw new LedgerKeyError(`Could not claim idempotency key ${key}; retry the call.`);
}

async function releaseKey(ledgerId: string) {
  await db.delete(schema.write_ledger).where(eq(schema.write_ledger.id, ledgerId));
}

async function completeKey(ledgerId: string, receipt: unknown) {
  await db
    .update(schema.write_ledger)
    .set({ receipt, completed_at: new Date() })
    .where(eq(schema.write_ledger.id, ledgerId));
}

async function recordIfChanged(call: LedgerCall, ledgerId: string, receipt: unknown) {
  await db.execute(sql`
    insert into write_ledger (id, user_id, source, tool, input, receipt, completed_at)
    select ${ledgerId}::uuid, ${call.userId}, ${call.source}, ${call.tool},
      ${JSON.stringify(call.input ?? null)}::jsonb, ${JSON.stringify(receipt ?? null)}::jsonb, now()
    where exists (select 1 from write_changes where ledger_id = ${ledgerId}::uuid)
  `);
}

export async function runLedgered<T>(
  call: LedgerCall,
  fn: () => Promise<T>,
  isFailure: (result: T) => boolean = () => false,
): Promise<LedgerOutcome<T>> {
  const ledgerId = crypto.randomUUID();
  const key = call.idempotencyKey;
  if (key) {
    const replay = await claimKey(call, ledgerId, key);
    if (replay) return replay;
  }

  let result: T;
  try {
    result = await runWithDbContext({ userId: call.userId, source: call.source, ledgerId }, fn);
  } catch (error) {
    if (key) await releaseKey(ledgerId).catch((releaseError) => logLedgerFailure("release", releaseError));
    throw error;
  }

  try {
    if (key) {
      if (isFailure(result)) await releaseKey(ledgerId);
      else await completeKey(ledgerId, result);
    } else {
      await recordIfChanged(call, ledgerId, result);
    }
  } catch (error) {
    logLedgerFailure("record", error);
  }
  return { replayed: false, result };
}
