import "server-only";

import { and, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { hasMacros, kcalOf } from "@/lib/macros";
import { matchesTerm, normalizeSearch } from "@/lib/search";
import { newId, round } from "@/lib/utils";

const { meals, catalog_items } = schema;

export const MAX_PORTIONS = 10;

function sameItemName(given: string, stored: string): boolean {
  const strip = (value: string) => normalizeSearch(value).replace(/\s+/g, "");
  return (
    strip(given) === strip(stored) ||
    matchesTerm(stored, given) ||
    strip(stored).includes(strip(given))
  );
}

export interface ResolvedMeal {
  catalog_item_id: string;
  name: string;
  place: string | null;
  portions: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  kcal: number;
  fat_quality: string | null;
}

function confidentNameMatch(given: string, stored: string): boolean {
  const strip = (value: string) => normalizeSearch(value).replace(/\s+/g, "");
  if (strip(given) === strip(stored)) return true;
  const words = given.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  return matchesTerm(stored, given);
}

async function findUniqueByName(
  userId: string,
  itemName: string,
): Promise<{ id: string; name: string } | null> {
  const rows = await db
    .select({
      id: catalog_items.id,
      name: catalog_items.name,
      protein_g: catalog_items.protein_g,
      fat_g: catalog_items.fat_g,
      carbs_g: catalog_items.carbs_g,
    })
    .from(catalog_items)
    .where(
      and(
        eq(catalog_items.user_id, userId),
        eq(catalog_items.archived, false),
      ),
    );

  const matches = rows.filter(
    (row) => hasMacros(row) && confidentNameMatch(itemName, row.name),
  );
  return matches.length === 1 ? matches[0] : null;
}

export interface ResolveInput {
  itemId: string;
  itemName?: string;
  portions?: number;
}

export type ResolveFailure =
  | "bad_portions"
  | "not_found"
  | "name_mismatch"
  | "no_macros";

export type ResolveResult =
  | { ok: true; meal: ResolvedMeal }
  | { ok: false; reason: ResolveFailure; error: string };

export async function resolveCatalogMeal(
  userId: string,
  input: ResolveInput,
): Promise<ResolveResult> {
  const portions = input.portions ?? 1;
  if (!(portions > 0) || portions > MAX_PORTIONS) {
    return {
      ok: false,
      reason: "bad_portions",
      error: `Portions must be between 0 and ${MAX_PORTIONS}.`,
    };
  }

  const [item] = await db
    .select()
    .from(catalog_items)
    .where(
      and(
        eq(catalog_items.id, input.itemId),
        eq(catalog_items.user_id, userId),
        eq(catalog_items.archived, false),
      ),
    )
    .limit(1);

  if (!item) {
    const recovered = input.itemName
      ? await findUniqueByName(userId, input.itemName)
      : null;
    if (recovered) {
      console.warn(
        `coach: log_meal id "${input.itemId}" not found, recovered "${input.itemName}" -> ${recovered.id}`,
      );
      return resolveCatalogMeal(userId, { ...input, itemId: recovered.id });
    }
    return { ok: false, reason: "not_found", error: "Catalog item not found" };
  }

  if (input.itemName && !sameItemName(input.itemName, item.name)) {
    console.warn(
      `coach: log_meal name mismatch, model sent "${input.itemName}" for "${item.name}"`,
    );
    return {
      ok: false,
      reason: "name_mismatch",
      error:
        "The id and the name do not refer to the same catalog item. Search the catalog again and use a matching pair.",
    };
  }

  if (!hasMacros(item)) {
    return {
      ok: false,
      reason: "no_macros",
      error: `${item.name} has no macros recorded yet, so it cannot be logged. Ask the user for them or offer to fill them in on the catalog item.`,
    };
  }

  const scaled = {
    protein_g: round(item.protein_g * portions),
    fat_g: round(item.fat_g * portions),
    carbs_g: round(item.carbs_g * portions),
  };

  return {
    ok: true,
    meal: {
      catalog_item_id: item.id,
      name: item.name,
      place: item.place,
      portions,
      ...scaled,
      kcal: round(kcalOf(scaled)),
      fat_quality: item.fat_quality,
    },
  };
}

const SIZE_PREFIX = /^\s*[\d.,]+\s*(g|gr|grs|gram|grams|kg|ml|l|oz)?\b\s*/i;

function sizeVariantKey(name: string): string {
  return normalizeSearch(name).replace(SIZE_PREFIX, "").trim();
}

export interface SizeVariant {
  id: string;
  name: string;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  kcal: number;
}

export async function sizeVariantsOf(
  userId: string,
  item: { id: string; name: string },
): Promise<SizeVariant[]> {
  const key = sizeVariantKey(item.name);
  if (!key || key === normalizeSearch(item.name)) return [];

  const rows = await db
    .select({
      id: catalog_items.id,
      name: catalog_items.name,
      protein_g: catalog_items.protein_g,
      fat_g: catalog_items.fat_g,
      carbs_g: catalog_items.carbs_g,
    })
    .from(catalog_items)
    .where(
      and(
        eq(catalog_items.user_id, userId),
        eq(catalog_items.archived, false),
      ),
    );

  const variants: SizeVariant[] = [];
  for (const row of rows) {
    if (row.id === item.id) continue;
    if (sizeVariantKey(row.name) !== key) continue;
    if (!hasMacros(row)) continue;
    variants.push({
      id: row.id,
      name: row.name,
      protein_g: row.protein_g,
      fat_g: row.fat_g,
      carbs_g: row.carbs_g,
      kcal: round(kcalOf(row)),
    });
  }
  return variants;
}

export async function insertResolvedMeal(
  userId: string,
  meal: ResolvedMeal,
  category: string,
  day: string,
): Promise<string> {
  const id = newId();
  await db.insert(meals).values({
    id,
    user_id: userId,
    logical_day: day,
    category,
    name: meal.name,
    place: meal.place,
    protein_g: meal.protein_g,
    fat_g: meal.fat_g,
    carbs_g: meal.carbs_g,
    fat_quality: meal.fat_quality,
    catalog_item_id: meal.catalog_item_id,
    created_at: new Date(),
  });
  return id;
}
