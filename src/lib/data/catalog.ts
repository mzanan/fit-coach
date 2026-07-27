import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db, schema } from "@/lib/db";
import type { CatalogComponent, CatalogItem } from "@/lib/db/schema";

const { catalog_items, catalog_components } = schema;

export interface CatalogItemFull extends CatalogItem {
  components: CatalogComponent[];
}

const getCachedCatalog = unstable_cache(
  async (userId: string): Promise<CatalogItemFull[]> => {
    const [items, comps] = await Promise.all([
      db
        .select()
        .from(catalog_items)
        .where(
          and(
            eq(catalog_items.user_id, userId),
            eq(catalog_items.archived, false),
          ),
        )
        .orderBy(asc(catalog_items.name)),
      db
        .select()
        .from(catalog_components)
        .where(eq(catalog_components.user_id, userId))
        .orderBy(asc(catalog_components.sort)),
    ]);

    const byItem = new Map<string, CatalogComponent[]>();
    for (const c of comps) {
      const list = byItem.get(c.item_id) ?? [];
      list.push(c);
      byItem.set(c.item_id, list);
    }

    return items.map((item) => ({
      ...item,
      components: byItem.get(item.id) ?? [],
    }));
  },
  ["catalog"],
  { tags: ["catalog"], revalidate: 300 },
);

export async function getCatalog(userId: string): Promise<CatalogItemFull[]> {
  const rows = await getCachedCatalog(userId);
  return rows.map((item) => ({
    ...item,
    created_at: new Date(item.created_at),
    updated_at: new Date(item.updated_at),
  }));
}
