import { count, sql } from "drizzle-orm";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { addReminder, listReminders, markReminderDone } from "@/lib/data/reminderList";
import { logHealthEvent } from "@/lib/data/healthEvents";
import { deleteFact, saveFact } from "@/lib/data/userFacts";
import { LedgerKeyError, runLedgered } from "@/lib/data/writeLedger";
import { saveMeasurement } from "@/lib/data/bodyMeasurements";
import { db, schema } from "@/lib/db";
import { runWithDbContext } from "@/lib/db/context";

const GLOBAL_TABLES = new Set([
  "user",
  "session",
  "account",
  "verification",
  "jwks",
  "exercise_catalog",
  "oauthAccessToken",
  "oauthClient",
  "oauthClientAssertion",
  "oauthClientResource",
  "oauthConsent",
  "oauthRefreshToken",
  "oauthResource",
]);

const owner = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
const userA = `dbtest-a-${crypto.randomUUID()}`;
const userB = `dbtest-b-${crypto.randomUUID()}`;

const asUser = <T>(userId: string, fn: () => T | PromiseLike<T>) => runWithDbContext({ userId, source: "app" }, fn);

async function userTables(): Promise<string[]> {
  const { rows } = await owner.query<{ table_name: string }>(
    "select table_name from information_schema.columns where table_schema = 'public' and column_name = 'user_id' order by 1",
  );
  return rows.map((row) => row.table_name);
}

async function seed(userId: string) {
  await asUser(userId, async () => {
    await addReminder(userId, { kind: "todo", text: `seed ${userId}`, due_on: null });
    await logHealthEvent(userId, { kind: "problem", title: "seed", details: null, started_on: "2026-10-01", resolved_on: null });
    await saveFact(userId, { domain: "diet", subject: "seed", content: "seed", source: "test" });
    await saveMeasurement(userId, { type: "waist", value: 80, logical_day: "2026-10-01" });
  });
}

beforeAll(async () => {
  if (process.env.DB_TESTS !== "1") throw new Error("Set DB_TESTS=1 and point .env.local at a dev database");
  await owner.connect();
  for (const id of [userA, userB]) {
    await owner.query(
      `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ($1, $1, $2, true, now(), now())`,
      [id, `${id}@dbtest.local`],
    );
  }
  await seed(userA);
  await seed(userB);
});

afterAll(async () => {
  await owner.query(`delete from "user" where id = any($1)`, [[userA, userB]]);
  await owner.end();
});

describe("database role", () => {
  it("runs the app as a role that cannot bypass row level security", async () => {
    const [role] = await asUser(userA, () =>
      db.execute<{ current_user: string; rolbypassrls: boolean; rolsuper: boolean }>(
        sql`select current_user, rolbypassrls, rolsuper from pg_roles where rolname = current_user`,
      ),
    ).then((result) => result.rows);
    expect(role.rolbypassrls).toBe(false);
    expect(role.rolsuper).toBe(false);
  });
});

describe("registry fitness", () => {
  it("forces row level security with an owner policy on every table that has user_id", async () => {
    const tables = await userTables();
    const { rows } = await owner.query<{ relname: string; forced: boolean; enabled: boolean; policy: string | null }>(
      `select c.relname, c.relforcerowsecurity as forced, c.relrowsecurity as enabled, p.polname as policy
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
       left join pg_policy p on p.polrelid = c.oid and p.polname = c.relname || '_owner_only'
       where n.nspname = 'public' and c.relname = any($1)`,
      [tables],
    );
    const unprotected = rows.filter((row) => !row.enabled || !row.forced || !row.policy).map((row) => row.relname);
    expect(unprotected).toEqual([]);
    expect(rows).toHaveLength(tables.length);
  });

  it("has no app table without user_id outside the global allowlist", async () => {
    const tables = new Set(await userTables());
    const { rows } = await owner.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'",
    );
    const unknown = rows.map((row) => row.table_name).filter((name) => !tables.has(name) && !GLOBAL_TABLES.has(name));
    expect(unknown).toEqual([]);
  });
});

describe("cross-user leakage", () => {
  it("never returns another user's rows from any user table", async () => {
    for (const table of await userTables()) {
      const visible = await asUser(userA, () =>
        db.execute<{ n: number }>(sql`select count(*)::int as n from ${sql.identifier(table)} where user_id = ${userB}`),
      );
      expect({ table, n: visible.rows[0].n }).toEqual({ table, n: 0 });
    }
  });

  it("sees the user's own seeded rows", async () => {
    const own = await asUser(userA, () => db.select({ n: count() }).from(schema.reminders));
    expect(own[0].n).toBe(1);
  });

  it("returns nothing without a user", async () => {
    const none = await runWithDbContext({ source: "cron" }, () => db.select({ n: count() }).from(schema.reminders));
    expect(none[0].n).toBe(0);
  });

  it("cannot write rows for another user or touch theirs by id", async () => {
    await expect(asUser(userA, () => addReminder(userB, { kind: "todo", text: "x", due_on: null }))).rejects.toThrow();
    const [foreign] = await asUser(userB, () => listReminders(userB, true, 1));
    expect(await asUser(userA, () => markReminderDone(userA, foreign.id, "2026-10-12"))).toBeNull();
    expect(await asUser(userA, () => deleteFact(userA, foreign.id))).toBe(false);
    const [still] = await asUser(userB, () => listReminders(userB, true, 1));
    expect(still.done_on).toBeNull();
  });

  it("cannot forge audit rows", async () => {
    await expect(
      asUser(userA, () =>
        db.execute(sql`insert into write_changes (user_id, source, table_name, op) values (${userA}, 'app', 'x', 'insert')`),
      ),
    ).rejects.toThrow();
  });
});

describe("idempotency", () => {
  it("writes once and replays the receipt for the same key", async () => {
    const call = { userId: userA, source: "mcp" as const, tool: "manage_reminder", input: { text: "once" }, idempotencyKey: "dbtest:once" };
    const write = () => addReminder(userA, { kind: "todo", text: "once", due_on: null });
    const first = await runLedgered(call, write);
    const second = await runLedgered(call, write);
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    if (!first.replayed && second.replayed) expect(second.receipt).toEqual(JSON.parse(JSON.stringify(first.result)));
    const rows = await asUser(userA, () => listReminders(userA, true, 50));
    expect(rows.filter((row) => row.text === "once")).toHaveLength(1);
  });

  it("rejects the same key with different data", async () => {
    const call = { userId: userA, source: "mcp" as const, tool: "manage_reminder", input: { text: "other" }, idempotencyKey: "dbtest:once" };
    await expect(runLedgered(call, async () => null)).rejects.toBeInstanceOf(LedgerKeyError);
  });

  it("records before and after images for a ledgered write", async () => {
    const outcome = await runLedgered({ userId: userA, source: "mcp", tool: "manage_reminder", input: { text: "audit" } }, () =>
      addReminder(userA, { kind: "todo", text: "audit", due_on: null }),
    );
    if (outcome.replayed) throw new Error("unexpected replay");
    const changes = await asUser(userA, () =>
      db.execute<{ op: string; source: string; ledger: boolean }>(
        sql`select op, source, ledger_id is not null as ledger from write_changes where row_id = ${outcome.result.id}`,
      ),
    );
    expect(changes.rows).toEqual([{ op: "insert", source: "mcp", ledger: true }]);
  });
});
