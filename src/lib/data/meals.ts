import "server-only";

import { and, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { Meal } from "@/lib/db/schema";
import type { MealPatch } from "@/lib/mealEdit";

const { meals } = schema;

export async function getMealForUser(userId: string, mealId: string): Promise<Meal | null> {
  const rows = await db
    .select()
    .from(meals)
    .where(and(eq(meals.user_id, userId), eq(meals.id, mealId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateMealForUser(
  userId: string,
  mealId: string,
  patch: MealPatch,
): Promise<Meal | null> {
  const rows = await db
    .update(meals)
    .set(patch)
    .where(and(eq(meals.user_id, userId), eq(meals.id, mealId)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteMealForUser(userId: string, mealId: string): Promise<boolean> {
  const deleted = await db
    .delete(meals)
    .where(and(eq(meals.user_id, userId), eq(meals.id, mealId)))
    .returning({ id: meals.id });
  return deleted.length > 0;
}
