import "server-only";

import { and, asc, eq, ilike } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { CatalogFields } from "@/lib/history/manageSchemas";
import { newId } from "@/lib/utils";

const { catalog_items } = schema;

export async function listCatalogItems(
  userId: string,
  options: { place?: string; includeArchived: boolean; offset: number; limit: number },
) {
  const filters = [eq(catalog_items.user_id, userId)];
  if (!options.includeArchived) filters.push(eq(catalog_items.archived, false));
  if (options.place) filters.push(ilike(catalog_items.place, `%${options.place}%`));
  return db
    .select({
      id: catalog_items.id,
      name: catalog_items.name,
      place: catalog_items.place,
      protein_g: catalog_items.protein_g,
      fat_g: catalog_items.fat_g,
      carbs_g: catalog_items.carbs_g,
      alcohol_g: catalog_items.alcohol_g,
      fat_quality: catalog_items.fat_quality,
      notes: catalog_items.notes,
      delivery: catalog_items.delivery,
      dinner_only: catalog_items.dinner_only,
      archived: catalog_items.archived,
    })
    .from(catalog_items)
    .where(and(...filters))
    .orderBy(asc(catalog_items.place), asc(catalog_items.name), asc(catalog_items.id))
    .offset(options.offset)
    .limit(options.limit);
}

export async function createCatalogItem(userId: string, fields: CatalogFields & { name: string }) {
  const now = new Date();
  const [row] = await db
    .insert(catalog_items)
    .values({ id: newId(), user_id: userId, ...fields, created_at: now, updated_at: now })
    .returning();
  return row;
}

export async function updateCatalogItem(userId: string, id: string, fields: CatalogFields) {
  const [row] = await db
    .update(catalog_items)
    .set({ ...fields, updated_at: new Date() })
    .where(and(eq(catalog_items.user_id, userId), eq(catalog_items.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteCatalogItem(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(catalog_items)
    .where(and(eq(catalog_items.user_id, userId), eq(catalog_items.id, id)))
    .returning({ id: catalog_items.id });
  return deleted.length > 0;
}
