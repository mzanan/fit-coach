import "server-only";

import { and, asc, eq, ne, or, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { newId } from "@/lib/utils";

const { user_facts } = schema;

export interface FactInput {
  domain: string;
  subject: string;
  content: string;
  scope?: string | null;
  review_on?: string | null;
  source: string;
}

const factColumns = {
  id: user_facts.id,
  domain: user_facts.domain,
  subject: user_facts.subject,
  content: user_facts.content,
  scope: user_facts.scope,
  review_on: user_facts.review_on,
  source: user_facts.source,
  updated_at: user_facts.updated_at,
};

export async function listFacts(userId: string, domain?: string, limit = 300) {
  return db
    .select(factColumns)
    .from(user_facts)
    .where(domain ? and(eq(user_facts.user_id, userId), eq(user_facts.domain, domain)) : eq(user_facts.user_id, userId))
    .orderBy(asc(user_facts.domain), asc(user_facts.subject))
    .limit(limit);
}

export async function saveFact(userId: string, input: FactInput, replacesId?: string) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const replaced = replacesId
      ? await tx
          .delete(user_facts)
          .where(
            and(
              eq(user_facts.user_id, userId),
              eq(user_facts.id, replacesId),
              or(ne(user_facts.domain, input.domain), ne(user_facts.subject, input.subject)),
            ),
          )
          .returning({ id: user_facts.id })
      : [];
    const [fact] = await tx
      .insert(user_facts)
      .values({
        id: newId(),
        user_id: userId,
        ...input,
        scope: input.scope ?? null,
        review_on: input.review_on ?? null,
        created_at: now,
        updated_at: now,
      })
      .onConflictDoUpdate({
        target: [user_facts.user_id, user_facts.domain, user_facts.subject],
        set: {
          content: input.content,
          scope: input.scope === undefined ? sql`${user_facts.scope}` : input.scope,
          review_on: input.review_on === undefined ? sql`${user_facts.review_on}` : input.review_on,
          source: input.source,
          updated_at: now,
        },
      })
      .returning(factColumns);
    return { fact, replaced: replaced.length > 0 };
  });
}

export async function deleteFact(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(user_facts)
    .where(and(eq(user_facts.user_id, userId), eq(user_facts.id, id)))
    .returning({ id: user_facts.id });
  return deleted.length > 0;
}

export async function retireScope(userId: string, scope: string): Promise<number> {
  const deleted = await db
    .delete(user_facts)
    .where(and(eq(user_facts.user_id, userId), eq(user_facts.scope, scope)))
    .returning({ id: user_facts.id });
  return deleted.length;
}
