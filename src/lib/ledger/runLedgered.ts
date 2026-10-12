import "server-only";

import { canonicalJson } from "@/lib/canonicalJson";
import {
  completeLedgerRow,
  deleteLedgerRow,
  findLedgerByKey,
  insertLedgerClaim,
  insertLedgerIfChanged,
  type LedgerRowInput,
} from "@/lib/data/writeLedger";
import { runAsUser, runWithDbContext, type WriteSource } from "@/lib/db/context";

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

export function ledgerValue<T>(outcome: LedgerOutcome<T>): unknown {
  return outcome.replayed ? outcome.receipt : outcome.result;
}

async function claimKey(row: LedgerRowInput, key: string): Promise<LedgerOutcome<never> | null> {
  if (await insertLedgerClaim(row, key)) return null;

  const existing = await findLedgerByKey(row.userId, key);
  if (!existing) throw new LedgerKeyError(`Could not claim idempotency key ${key}; retry the call.`);
  if (existing.tool !== row.tool || canonicalJson(existing.input) !== canonicalJson(row.input)) {
    throw new LedgerKeyError(
      `Idempotency key ${key} was already used for a different write; use a new key for new or corrected data.`,
    );
  }
  if (existing.completed_at) return { replayed: true, receipt: existing.receipt };
  if (Date.now() - existing.created_at.getTime() < STALE_CLAIM_MS) {
    throw new LedgerKeyError(`A call with idempotency key ${key} is still running; read the data before retrying.`);
  }
  await deleteLedgerRow(existing.id);
  if (await insertLedgerClaim(row, key)) return null;
  throw new LedgerKeyError(`Could not claim idempotency key ${key}; retry the call.`);
}

async function ledgered<T>(
  call: LedgerCall,
  fn: () => Promise<T>,
  isFailure: (result: T) => boolean,
): Promise<LedgerOutcome<T>> {
  const row: LedgerRowInput = {
    id: crypto.randomUUID(),
    userId: call.userId,
    source: call.source,
    tool: call.tool,
    input: call.input,
  };
  const key = call.idempotencyKey;
  if (key) {
    const replay = await claimKey(row, key);
    if (replay) return replay;
  }

  let result: T;
  try {
    result = await runWithDbContext({ userId: call.userId, source: call.source, ledgerId: row.id }, fn);
  } catch (error) {
    if (key) await deleteLedgerRow(row.id).catch((releaseError) => logLedgerFailure("release", releaseError));
    throw error;
  }

  try {
    if (key) {
      if (isFailure(result)) await deleteLedgerRow(row.id);
      else await completeLedgerRow(row.id, result);
    } else {
      await insertLedgerIfChanged(row, result);
    }
  } catch (error) {
    logLedgerFailure("record", error);
  }
  return { replayed: false, result };
}

export function runLedgered<T>(
  call: LedgerCall,
  fn: () => Promise<T>,
  isFailure: (result: T) => boolean = () => false,
): Promise<LedgerOutcome<T>> {
  return runAsUser(call.userId, call.source, () => ledgered(call, fn, isFailure));
}
