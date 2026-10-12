import type { Pool, PoolClient, QueryConfig, QueryResult } from "pg";

import { contextSettings, resolveDbContext, SET_CONTEXT_SQL, setContextLiteralSql, type DbContext } from "./context";

type QueryInput = string | QueryConfig;
type ConnectCallback = (error: Error | undefined, client: PoolClient | undefined, done: (release?: unknown) => void) => void;
type RawQuery = (input: QueryInput, values?: unknown[]) => Promise<QueryResult>;

function queryText(input: QueryInput): string {
  return typeof input === "string" ? input : input.text;
}

function isBegin(input: QueryInput): boolean {
  return /^\s*begin\b/i.test(queryText(input));
}

function beginWithContext(context: DbContext): string {
  return `begin; ${setContextLiteralSql(context)}`;
}

function bindContext(client: PoolClient, context: DbContext): PoolClient {
  const query = client.query.bind(client) as RawQuery;
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop !== "query") return Reflect.get(target, prop, receiver);
      return async (input: QueryInput, values?: unknown[]) => {
        const result = await query(input, values);
        if (!isBegin(input)) return result;
        try {
          await query(SET_CONTEXT_SQL, contextSettings(context));
        } catch (error) {
          await query("rollback").catch(() => undefined);
          target.release(error instanceof Error ? error : true);
          throw error;
        }
        return result;
      };
    },
  });
}

async function queryInContext(
  connect: () => Promise<PoolClient>,
  context: DbContext,
  input: QueryInput,
  values?: unknown[],
) {
  const preamble = beginWithContext(context);
  const client = await connect();
  let broken: Error | undefined;
  const onError = (error: Error) => {
    broken = error;
  };
  client.on("error", onError);
  try {
    await client.query(preamble);
    const result = await client.query(input as QueryConfig, values);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch((rollbackError: Error) => {
      broken = rollbackError;
    });
    throw error;
  } finally {
    client.off("error", onError);
    client.release(broken);
  }
}

export function applyDbContext(pool: Pool): Pool {
  const baseQuery = pool.query.bind(pool) as RawQuery;
  const baseConnect = pool.connect.bind(pool) as (callback?: ConnectCallback) => Promise<PoolClient> | void;

  pool.query = (async (input: QueryInput, values?: unknown[]) => {
    const context = await resolveDbContext();
    return context
      ? queryInContext(() => baseConnect() as Promise<PoolClient>, context, input, values)
      : baseQuery(input, values);
  }) as unknown as Pool["query"];

  pool.connect = ((callback?: ConnectCallback) => {
    if (callback) return baseConnect(callback);
    return resolveDbContext().then(async (context) => {
      const client = await (baseConnect() as Promise<PoolClient>);
      return context ? bindContext(client, context) : client;
    });
  }) as unknown as Pool["connect"];

  return pool;
}
