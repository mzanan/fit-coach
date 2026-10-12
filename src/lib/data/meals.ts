import "server-only";

import { and, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";

const { meals } = schema;

export async function deleteMealForUser(userId: string, mealId: string): Promise<boolean> {
  const deleted = await db
    .delete(meals)
    .where(and(eq(meals.user_id, userId), eq(meals.id, mealId)))
    .returning({ id: meals.id });
  return deleted.length > 0;
}
