import "server-only";

import { desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { normalizeSearch } from "@/lib/search";

const { meals } = schema;

export interface RecentMeal {
  id: string;
  name: string;
  place: string | null;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fat_quality: string | null;
  catalog_item_id: string | null;
}

export async function getRecentMeals(userId: string): Promise<RecentMeal[]> {
  const rows = await db
    .select({
      id: meals.id,
      name: meals.name,
      place: meals.place,
      protein_g: meals.protein_g,
      fat_g: meals.fat_g,
      carbs_g: meals.carbs_g,
      fat_quality: meals.fat_quality,
      catalog_item_id: meals.catalog_item_id,
    })
    .from(meals)
    .where(eq(meals.user_id, userId))
    .orderBy(desc(meals.created_at))
    .limit(60);

  const seen = new Set<string>();
  const deduped: RecentMeal[] = [];
  for (const row of rows) {
    const key = row.catalog_item_id ?? `manual:${normalizeSearch(row.name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return deduped.slice(0, 10);
}
