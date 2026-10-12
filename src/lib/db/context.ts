import { AsyncLocalStorage } from "node:async_hooks";

export type WriteSource = "app" | "coach" | "mcp" | "cron" | "workflow";

export interface DbContext {
  userId?: string;
  source: WriteSource;
  ledgerId?: string;
}

const storage = new AsyncLocalStorage<DbContext>();

export function runWithDbContext<T>(context: DbContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function currentDbContext(): DbContext | undefined {
  return storage.getStore();
}

export function contextSettings(context: DbContext): [string, string, string] {
  return [context.userId ?? "", context.source, context.ledgerId ?? ""];
}

export const SET_CONTEXT_SQL =
  "select set_config('app.user_id', $1, true), set_config('app.source', $2, true), set_config('app.ledger_id', $3, true)";
