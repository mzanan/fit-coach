import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let cached: DrizzleDb | null = null;

function init(): DrizzleDb {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }
  const replicaPath = process.env.TURSO_EMBEDDED_REPLICA_PATH;
  const client = replicaPath
    ? createClient({
        url: `file:${replicaPath}`,
        syncUrl: url,
        authToken: process.env.TURSO_AUTH_TOKEN,
        syncInterval: 60,
      })
    : createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return drizzle(client, { schema });
}

export const db = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    if (!cached) cached = init();
    return (cached as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export { schema };
