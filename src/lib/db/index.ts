import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { blockDbQueries, gateDbQueries, setDbUserResolver } from "./context";
import { applyDbContext } from "./contextPool";
import * as schema from "./schema";
import { sessionUserId } from "@/lib/sessionUser";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let cachedApp: DrizzleDb | null = null;
let cachedAuth: DrizzleDb | null = null;

function createPool(max: number): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on("error", (error) => {
    console.error("[db] idle client error", error);
  });
  attachDatabasePool(pool);
  return pool;
}

function guardRuntimeRole(pool: Pool): Promise<void> {
  return pool
    .query<{ role: string; bypass: boolean }>(
      "select current_user as role, (rolbypassrls or rolsuper) as bypass from pg_roles where rolname = current_user",
    )
    .then(({ rows }) => {
      if (!rows[0]?.bypass) return;
      const reason = `[db] runtime role ${rows[0].role} bypasses row level security; DATABASE_URL must use app_rw`;
      console.error(reason);
      if (process.env.VERCEL_ENV === "production") blockDbQueries(reason);
    })
    .catch((error) => {
      console.error("[db] runtime role check failed", error);
    });
}

function initApp(): DrizzleDb {
  setDbUserResolver(sessionUserId);
  const pool = createPool(5);
  gateDbQueries(guardRuntimeRole(pool));
  return drizzle(applyDbContext(pool), { schema });
}

function initAuth(): DrizzleDb {
  return drizzle(createPool(3), { schema });
}

function lazy(init: () => DrizzleDb, read: () => DrizzleDb | null, write: (value: DrizzleDb) => void): DrizzleDb {
  return new Proxy({} as DrizzleDb, {
    get(_, prop) {
      let instance = read();
      if (!instance) {
        instance = init();
        write(instance);
      }
      return (instance as unknown as Record<string | symbol, unknown>)[prop];
    },
  });
}

export const db = lazy(initApp, () => cachedApp, (value) => (cachedApp = value));

export const authDb = lazy(initAuth, () => cachedAuth, (value) => (cachedAuth = value));

export { schema };
