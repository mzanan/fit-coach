import { AsyncLocalStorage } from "node:async_hooks";

export type WriteSource = "app" | "coach" | "mcp" | "cron" | "workflow";

export interface DbContext {
  userId?: string;
  source: WriteSource;
  ledgerId?: string;
}

type UserResolver = () => Promise<string | null>;

const storage = new AsyncLocalStorage<DbContext>();
let resolveUser: UserResolver | null = null;

export function setDbUserResolver(resolver: UserResolver) {
  resolveUser = resolver;
}

export async function resolveDbContext(): Promise<DbContext | undefined> {
  const context = storage.getStore();
  if (context || !resolveUser) return context;
  const userId = await resolveUser();
  return userId ? { userId, source: "app" } : undefined;
}

export function runWithDbContext<T>(context: DbContext, fn: () => T | PromiseLike<T>): Promise<T> {
  return storage.run(context, async () => await fn());
}

export function currentDbContext(): DbContext | undefined {
  return storage.getStore();
}

export function contextSettings(context: DbContext): [string, string, string] {
  return [context.userId ?? "", context.source, context.ledgerId ?? ""];
}

export const SET_CONTEXT_SQL =
  "select set_config('app.user_id', $1, true), set_config('app.source', $2, true), set_config('app.ledger_id', $3, true)";
