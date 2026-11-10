import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import * as schema from "@/lib/db/schema";

const MIGRATIONS = path.resolve(__dirname, "../../../drizzle/migrations");

function withoutComments(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

function rlsTablesFromMigrations(): Set<string> {
  const tables = new Set<string>();
  const files = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = withoutComments(readFileSync(path.join(MIGRATIONS, file), "utf8"));
    if (sql.includes("ENABLE ROW LEVEL SECURITY")) {
      for (const block of sql.matchAll(/ARRAY\[([^\]]+)\]/g)) {
        for (const name of block[1].matchAll(/'([a-z_]+)'/g)) tables.add(name[1]);
      }
      for (const match of sql.matchAll(/ALTER TABLE "?([a-z_]+)"? ENABLE ROW LEVEL SECURITY/g)) tables.add(match[1]);
    }
    for (const match of sql.matchAll(/ALTER TABLE "?([a-z_]+)"? DISABLE ROW LEVEL SECURITY/g)) tables.delete(match[1]);
    for (const match of sql.matchAll(/DROP POLICY [^;]* ON "?([a-z_]+)"?/g)) tables.delete(match[1]);
  }
  return tables;
}

function userTables(): string[] {
  return (Object.values(schema) as unknown[])
    .filter((value): value is PgTable => is(value, PgTable))
    .map((table) => getTableConfig(table))
    .filter((config) => config.columns.some((column) => column.name === "user_id"))
    .map((config) => config.name);
}

describe("row level security coverage", () => {
  it("enables RLS in a migration for every table with a user_id column", () => {
    const covered = rlsTablesFromMigrations();
    const tables = userTables();
    expect(tables.length).toBeGreaterThan(20);
    expect(tables.filter((name) => !covered.has(name))).toEqual([]);
  });
});
