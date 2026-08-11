import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { newId } from "@/lib/utils";

const { user_rules } = schema;

export interface UserRuleRow {
  key: string;
  value: string;
  set_at: Date;
}

export async function listActiveRules(userId: string): Promise<UserRuleRow[]> {
  return db
    .select({
      key: user_rules.key,
      value: user_rules.value,
      set_at: user_rules.set_at,
    })
    .from(user_rules)
    .where(and(eq(user_rules.user_id, userId), eq(user_rules.active, true)))
    .orderBy(desc(user_rules.set_at));
}

export async function getActiveRule(
  userId: string,
  key: string,
): Promise<UserRuleRow | null> {
  const [row] = await db
    .select({
      key: user_rules.key,
      value: user_rules.value,
      set_at: user_rules.set_at,
    })
    .from(user_rules)
    .where(
      and(
        eq(user_rules.user_id, userId),
        eq(user_rules.key, key),
        eq(user_rules.active, true),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function saveRule(
  userId: string,
  key: string,
  value: string,
): Promise<void> {
  const now = Date.now();
  const id = newId();
  await db.transaction(async (tx) => {
    await tx.run(sql`
      UPDATE user_rules
      SET active = 0
      WHERE user_id = ${userId} AND key = ${key} AND active = 1
    `);
    await tx.run(sql`
      INSERT INTO user_rules (id, user_id, key, value, set_at, active)
      VALUES (${id}, ${userId}, ${key}, ${value}, ${now}, 1)
    `);
  });
}
