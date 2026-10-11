import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient, type InValue, type ResultSet, type Row } from "@libsql/client";
import { Client } from "pg";

const TABLES = [
  "user",
  "session",
  "account",
  "verification",
  "profiles",
  "catalog_items",
  "catalog_components",
  "days",
  "routine_slots",
  "meals",
  "coach_memory",
  "push_subscriptions",
  "ai_credentials",
  "coach_messages",
  "coach_pending_writes",
  "coach_facts",
  "user_rules",
  "fatigue_logs",
  "ai_events",
  "workouts",
  "exercise_catalog",
  "routine_exercises",
  "workout_exercises",
  "workout_sets",
  "body_scans",
  "body_measurements",
  "import_runs",
  "import_files",
  "import_chunks",
] as const;

const INSERT_CHUNK = 200;
const MAX_REPORTED_MISMATCHES = 5;

type ColumnType = "timestamp" | "boolean" | "vector" | "integer" | "number" | "text";

interface TableReport {
  table: string;
  source: number;
  target: number;
  mismatches: number;
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function hostLabel(url: string): string {
  return new URL(url).host.split(".")[0];
}

function columnType(dataType: string, udtName: string): ColumnType {
  if (dataType.startsWith("timestamp")) return "timestamp";
  if (dataType === "boolean") return "boolean";
  if (udtName === "vector") return "vector";
  if (["integer", "bigint", "smallint"].includes(dataType)) return "integer";
  if (["double precision", "real", "numeric"].includes(dataType)) return "number";
  return "text";
}

function blobToFloats(value: unknown): number[] {
  const bytes =
    value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : ArrayBuffer.isView(value)
        ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
        : null;
  if (!bytes) throw new Error("Unexpected vector value type");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const floats: number[] = [];
  for (let offset = 0; offset + 4 <= bytes.byteLength; offset += 4) {
    floats.push(view.getFloat32(offset, true));
  }
  return floats;
}

const NUMERIC_TEXT = /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i;

function strictNumber(value: unknown, where: string): number {
  if (typeof value === "number" || typeof value === "bigint") return Number(value);
  if (typeof value === "string" && NUMERIC_TEXT.test(value)) return Number(value);
  throw new Error(`${where}: not a number: ${JSON.stringify(value)}`);
}

function convert(value: unknown, type: ColumnType, where: string): unknown {
  if (value == null) return null;
  switch (type) {
    case "timestamp": {
      const ms = strictNumber(value, where);
      if (!Number.isInteger(ms)) throw new Error(`${where}: timestamp is not integer ms: ${value}`);
      return new Date(ms);
    }
    case "boolean": {
      const n = strictNumber(value, where);
      if (n !== 0 && n !== 1) throw new Error(`${where}: boolean is not 0 or 1: ${value}`);
      return n === 1;
    }
    case "vector":
      return `[${blobToFloats(value).join(",")}]`;
    case "integer": {
      const n = strictNumber(value, where);
      if (!Number.isInteger(n)) throw new Error(`${where}: not an integer: ${value}`);
      return n;
    }
    case "number":
      return strictNumber(value, where);
    default: {
      if (typeof value !== "string" && typeof value !== "number") {
        throw new Error(`${where}: unexpected text value type ${typeof value}`);
      }
      const text = String(value);
      if (text.includes("\u0000")) throw new Error(`${where}: text contains NUL`);
      return text;
    }
  }
}

function normalize(value: unknown, type: ColumnType): string {
  if (value == null) return "null";
  switch (type) {
    case "timestamp":
      return String((value as Date).getTime());
    case "boolean":
      return String(Boolean(value));
    case "vector":
      return String(value)
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((v) => Math.fround(Number(v)))
        .join(",");
    case "integer":
    case "number":
      return String(Number(value));
    default:
      return String(value);
  }
}

async function main() {
  const sourceUrl = requireEnv("TURSO_DATABASE_URL");
  const targetUrl = requireEnv("DATABASE_URL_UNPOOLED");
  const write = process.argv.includes("--write");
  const replace = process.argv.includes("--replace");

  if (hostLabel(sourceUrl) !== argValue("--source")) {
    throw new Error(`--source must be exactly ${hostLabel(sourceUrl)}`);
  }
  if (hostLabel(targetUrl) !== argValue("--target")) {
    throw new Error(`--target must be exactly ${hostLabel(targetUrl)}`);
  }
  console.log(
    `source ${new URL(sourceUrl).host}\ntarget ${new URL(targetUrl).host}\nmode ${write ? (replace ? "WRITE --replace" : "WRITE") : "dry-run"}`,
  );

  const source = createClient({ url: sourceUrl, authToken: process.env.TURSO_AUTH_TOKEN });
  const snapshot = await source.transaction("read");
  const sourceData = new Map<string, ResultSet>();
  try {
    for (const table of TABLES) {
      sourceData.set(table, await snapshot.execute(`select * from "${table}"`));
    }
  } finally {
    snapshot.close();
  }
  const target = new Client({ connectionString: targetUrl });
  await target.connect();

  const columnRows = await target.query<{
    table_name: string;
    column_name: string;
    data_type: string;
    udt_name: string;
  }>(
    "select table_name, column_name, data_type, udt_name from information_schema.columns where table_schema = 'public'",
  );
  const columns = new Map<string, Map<string, ColumnType>>();
  for (const row of columnRows.rows) {
    const table = columns.get(row.table_name) ?? new Map<string, ColumnType>();
    table.set(row.column_name, columnType(row.data_type, row.udt_name));
    columns.set(row.table_name, table);
  }

  const pkRows = await target.query<{ table_name: string; column_name: string }>(
    `select tc.table_name, kcu.column_name
     from information_schema.table_constraints tc
     join information_schema.key_column_usage kcu
       on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
     where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema = 'public'
     order by kcu.ordinal_position`,
  );
  const primaryKeys = new Map<string, string[]>();
  for (const row of pkRows.rows) {
    primaryKeys.set(row.table_name, [...(primaryKeys.get(row.table_name) ?? []), row.column_name]);
  }

  const report: TableReport[] = [];
  const mismatchSamples: string[] = [];

  try {
    if (write) {
      await target.query("BEGIN");
      const existing = await target.query<{ n: string }>('select count(*) as n from "user"');
      if (Number(existing.rows[0].n) > 0 && !replace) {
        throw new Error(
          "Target already has users. Refusing to overwrite; pass --replace only for a deliberate re-run.",
        );
      }
      await target.query(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);
    }

    for (const table of TABLES) {
      const targetColumns = columns.get(table);
      const pk = primaryKeys.get(table);
      if (!targetColumns || !pk) throw new Error(`Target is missing table or primary key: ${table}`);

      const result = sourceData.get(table)!;
      const sourceColumns = result.columns;
      const missing = sourceColumns.filter((c) => !targetColumns.has(c));
      if (missing.length) throw new Error(`${table}: target lacks columns ${missing.join(", ")}`);

      const converted = result.rows.map((row: Row) =>
        Object.fromEntries(
          sourceColumns.map((c) => [
            c,
            convert(row[c] as InValue, targetColumns.get(c)!, `${table}.${c}`),
          ]),
        ),
      );

      let targetCount = converted.length;
      let mismatches = 0;

      if (write) {
        for (let start = 0; start < converted.length; start += INSERT_CHUNK) {
          const chunk = converted.slice(start, start + INSERT_CHUNK);
          const params: unknown[] = [];
          const values = chunk.map((row) => {
            const placeholders = sourceColumns.map((c) => {
              params.push(row[c]);
              return targetColumns.get(c) === "vector" ? `$${params.length}::vector` : `$${params.length}`;
            });
            return `(${placeholders.join(", ")})`;
          });
          await target.query(
            `insert into "${table}" (${sourceColumns.map((c) => `"${c}"`).join(", ")}) values ${values.join(", ")}`,
            params,
          );
        }

        const selectList = sourceColumns
          .map((c) => (targetColumns.get(c) === "vector" ? `"${c}"::text as "${c}"` : `"${c}"`))
          .join(", ");
        const written = await target.query<Record<string, unknown>>(`select ${selectList} from "${table}"`);
        targetCount = written.rows.length;
        const key = (row: Record<string, unknown>) => pk.map((c) => String(row[c])).join("|");
        const byKey = new Map(written.rows.map((row) => [key(row), row]));

        for (const expected of converted) {
          const actual = byKey.get(key(expected));
          const diff = actual
            ? sourceColumns.find(
                (c) =>
                  normalize(expected[c], targetColumns.get(c)!) !==
                  normalize(actual[c], targetColumns.get(c)!),
              )
            : "missing row";
          if (diff) {
            mismatches += 1;
            if (mismatchSamples.length < MAX_REPORTED_MISMATCHES) {
              mismatchSamples.push(`${table} ${key(expected)}: ${diff}`);
            }
          }
        }
      }

      report.push({ table, source: converted.length, target: targetCount, mismatches });
    }

    console.table(report);
    const failed = report.filter((r) => r.mismatches > 0 || r.source !== r.target);
    if (mismatchSamples.length) console.log(mismatchSamples.join("\n"));

    if (write) {
      if (failed.length) {
        throw new Error(`Verification failed for ${failed.map((r) => r.table).join(", ")}`);
      }
      await target.query("COMMIT");
      console.log("committed: every row compared column by column");
    } else {
      console.log("dry-run: conversion checked, nothing written");
    }
  } catch (error) {
    if (write) {
      await target.query("ROLLBACK").catch(() => undefined);
      console.log("rolled back");
    }
    throw error;
  } finally {
    await target.end();
    source.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
