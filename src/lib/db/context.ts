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

export function runAsUser<T>(userId: string, source: WriteSource, fn: () => T | PromiseLike<T>): Promise<T> {
  return runWithDbContext({ userId, source }, fn);
}

const CONTEXT_SETTINGS = [
  ["app.user_id", (context: DbContext) => context.userId ?? ""],
  ["app.source", (context: DbContext) => context.source],
  ["app.ledger_id", (context: DbContext) => context.ledgerId ?? ""],
] as const;

export function contextSettings(context: DbContext): string[] {
  return CONTEXT_SETTINGS.map(([, read]) => read(context));
}

function setConfigSql(values: string[]): string {
  return `select ${CONTEXT_SETTINGS.map(([name], index) => `set_config('${name}', ${values[index]}, true)`).join(", ")}`;
}

export const SET_CONTEXT_SQL = setConfigSql(CONTEXT_SETTINGS.map((_, index) => `$${index + 1}`));

const SAFE_SETTING = /^[A-Za-z0-9_:-]*$/;

export function setContextLiteralSql(context: DbContext): string {
  const values = contextSettings(context);
  if (!values.every((value) => SAFE_SETTING.test(value))) throw new Error("Invalid database context value");
  return setConfigSql(values.map((value) => `'${value}'`));
}
