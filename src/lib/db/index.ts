import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let cached: DrizzleDb | null = null;

function init(): DrizzleDb {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 5_000 });
  pool.on("error", (error) => {
    console.error("[db] idle client error", error);
  });
  attachDatabasePool(pool);
  return drizzle(pool, { schema });
}

export const db = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    if (!cached) cached = init();
    return (cached as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export { schema };
