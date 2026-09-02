import "server-only";

import { and, eq, or } from "drizzle-orm";

import { insertResolvedMeal, resolveCatalogMeal } from "@/lib/catalogMeal";
import type { DayType } from "@/lib/dayType";
import { db, schema } from "@/lib/db";

const { catalog_items } = schema;

export async function insertAutoMeals(
  userId: string,
  day: string,
  dayType: DayType,
): Promise<void> {
  const items = await db
    .select()
    .from(catalog_items)
    .where(
      and(
        eq(catalog_items.user_id, userId),
        eq(catalog_items.archived, false),
        or(
          eq(catalog_items.auto_day_type, "any"),
          eq(catalog_items.auto_day_type, dayType),
        ),
      ),
    );

  for (const item of items) {
    if (!item.auto_category) continue;
    const resolved = await resolveCatalogMeal(userId, {
      itemId: item.id,
      itemName: item.name,
    });
    if (!resolved.ok) continue;
    await insertResolvedMeal(userId, resolved.meal, item.auto_category, day);
  }
}
