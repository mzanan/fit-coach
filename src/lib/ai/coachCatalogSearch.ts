import "server-only";

import { count, desc, eq } from "drizzle-orm";

import { sizeVariantKey } from "@/lib/catalogMeal";
import { getCatalog } from "@/lib/data/catalog";
import { db, schema } from "@/lib/db";
import { hasMacros } from "@/lib/macros";
import { matchesTerm } from "@/lib/search";

const { meals } = schema;

const CATALOG_RESULTS = 8;
const CATALOG_SAMPLE = 12;
const MAX_QUERY_TERMS = 12;

async function mostEaten<T extends { id: string }>(
  userId: string,
  items: T[],
  limit: number,
): Promise<T[]> {
  const rows = await db
    .select({ id: meals.catalog_item_id, uses: count() })
    .from(meals)
    .where(eq(meals.user_id, userId))
    .groupBy(meals.catalog_item_id)
    .orderBy(desc(count()))
    .limit(limit);

  const ranking = new Map(
    rows
      .filter((row): row is { id: string; uses: number } => Boolean(row.id))
      .map((row, index) => [row.id, index]),
  );
  return [...items].sort(
    (a, b) =>
      (ranking.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (ranking.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

function placeCounts<T extends { place: string | null }>(
  items: T[],
): { place: string; items: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const place = item.place?.trim() || "No place";
    counts.set(place, (counts.get(place) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([place, count]) => ({ place, items: count }))
    .sort((a, b) => b.items - a.items);
}

function spreadByPlace<T extends { place: string | null }>(
  items: T[],
  limit: number,
): T[] {
  const byPlace = new Map<string, T[]>();
  for (const item of items) {
    const place = item.place?.trim() || "No place";
    const list = byPlace.get(place) ?? [];
    list.push(item);
    byPlace.set(place, list);
  }
  const queues = [...byPlace.values()];
  const picked: T[] = [];
  let round = 0;
  while (picked.length < limit && queues.some((q) => q.length > round)) {
    for (const queue of queues) {
      if (picked.length >= limit) break;
      const item = queue[round];
      if (item) picked.push(item);
    }
    round += 1;
  }
  return picked;
}

export interface CatalogSearchResult {
  query_matched: boolean;
  catalog_size: number;
  items_with_macros: number;
  places: { place: string; items: number }[];
  note: string | undefined;
  items: {
    id: string;
    name: string;
    place: string | null;
    protein_g: number | null;
    fat_g: number | null;
    carbs_g: number | null;
    fat_quality: string | null;
  }[];
}

export async function searchCatalog(
  userId: string,
  queries: string[],
): Promise<CatalogSearchResult> {
  const terms = queries
    .slice(0, MAX_QUERY_TERMS)
    .map((query) => query.trim())
    .filter(Boolean);
  const items = (await getCatalog(userId)).filter((item) => !item.archived);
  const hits = terms.length
    ? items.filter((item) =>
        terms.some(
          (term) =>
            matchesTerm(item.name, term) ||
            (item.place ? matchesTerm(item.place, term) : false),
        ),
      )
    : [];
  const matched = hits.length > 0;
  const usableHits = hits.filter(hasMacros);
  const withMacros = items.filter(hasMacros);
  const sample = spreadByPlace(
    await mostEaten(userId, withMacros.length ? withMacros : items, CATALOG_SAMPLE),
    CATALOG_SAMPLE,
  );
  const chosen = matched
    ? [
        ...[...usableHits, ...hits.filter((item) => !hasMacros(item))].slice(
          0,
          CATALOG_RESULTS,
        ),
        ...(usableHits.length ? [] : sample),
      ]
    : sample;
  const chosenUsable = chosen.filter(hasMacros).length;
  console.info(
    `coach: search_catalog ${JSON.stringify(terms)} -> ${hits.length} hits (${usableHits.length} usable) of ${items.length}, returning ${chosen.length}`,
  );
  const hitFamilies = new Set(hits.map((item) => sizeVariantKey(item.name)));
  const note = !items.length
    ? "The user's catalog is empty. Tell them so and offer to add items; do not name any food as if it were saved."
    : !chosenUsable
      ? "None of these items has recorded macros, and neither does anything else in the catalog. Say that plainly and offer to fill the macros in; never invent numbers or a dish."
      : !matched
        ? "Nothing matched those terms, so these are a sample of the catalog across the user's places. Suggest from them; do not say the catalog is empty or that you found nothing."
        : usableHits.length > 1 && hitFamilies.size === 1
          ? "These are the SAME item at different sizes. If the user is asking to log this, call log_meal with ANY one of them right now: the app will show them a card to pick the exact size before writing anything. Do not ask them to specify the size in chat."
          : usableHits.length
            ? undefined
            : "The matched items have no recorded macros, and a sample of items WITH macros from the rest of the catalog follows them. Suggest from those.";
  return {
    query_matched: matched,
    catalog_size: items.length,
    items_with_macros: withMacros.length,
    places: placeCounts(items),
    note,
    items: chosen.map((item) => ({
      id: item.id,
      name: item.name,
      place: item.place,
      protein_g: item.protein_g,
      fat_g: item.fat_g,
      carbs_g: item.carbs_g,
      fat_quality: item.fat_quality,
    })),
  };
}
