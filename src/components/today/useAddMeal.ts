"use client";

import { useMemo, useState } from "react";

import { addMealFromCatalog, repeatMeal } from "@/lib/actions/meals";
import type { CatalogItemFull } from "@/lib/data/catalog";
import type { RecentMeal } from "@/lib/data/recentMeals";
import { normalizeSearch } from "@/lib/search";

export interface PickerItem {
  key: string;
  name: string;
  place: string | null;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fat_quality: string | null;
  action: (category: string, day: string) => Promise<string>;
}

export function useAddMeal({
  catalog,
  recents,
}: {
  catalog: CatalogItemFull[];
  recents: RecentMeal[];
}) {
  const [query, setQuery] = useState("");

  const simpleCatalog = useMemo(
    () => catalog.filter((c) => !c.is_composable && !c.archived),
    [catalog],
  );
  const catalogById = useMemo(
    () => new Map(catalog.map((c) => [c.id, c])),
    [catalog],
  );

  const recentItems = useMemo(() => {
    const items: PickerItem[] = [];
    for (const r of recents) {
      if (r.catalog_item_id) {
        const item = catalogById.get(r.catalog_item_id);
        if (!item || item.archived) continue;
        if (item.is_composable) {
          items.push({
            key: `recent:${r.id}`,
            name: r.name,
            place: r.place,
            protein_g: r.protein_g,
            fat_g: r.fat_g,
            carbs_g: r.carbs_g,
            fat_quality: r.fat_quality,
            action: (category, day) =>
              repeatMeal({ mealId: r.id, category, day }),
          });
        } else {
          items.push({
            key: `recent:${r.id}`,
            name: item.name,
            place: item.place,
            protein_g: item.protein_g,
            fat_g: item.fat_g,
            carbs_g: item.carbs_g,
            fat_quality: item.fat_quality,
            action: (category, day) =>
              addMealFromCatalog({ itemId: item.id, category, day }),
          });
        }
      } else {
        items.push({
          key: `recent:${r.id}`,
          name: r.name,
          place: r.place,
          protein_g: r.protein_g,
          fat_g: r.fat_g,
          carbs_g: r.carbs_g,
          fat_quality: r.fat_quality,
          action: (category, day) => repeatMeal({ mealId: r.id, category, day }),
        });
      }
    }
    return items.slice(0, 6);
  }, [recents, catalogById]);

  const recentCatalogIds = useMemo(
    () => new Set(recents.map((r) => r.catalog_item_id).filter(Boolean)),
    [recents],
  );

  const catalogItems = useMemo(() => {
    return simpleCatalog
      .filter((c) => !recentCatalogIds.has(c.id))
      .map((c): PickerItem => ({
        key: `catalog:${c.id}`,
        name: c.name,
        place: c.place,
        protein_g: c.protein_g,
        fat_g: c.fat_g,
        carbs_g: c.carbs_g,
        fat_quality: c.fat_quality,
        action: (category, day) =>
          addMealFromCatalog({ itemId: c.id, category, day }),
      }));
  }, [simpleCatalog, recentCatalogIds]);

  const q = normalizeSearch(query);
  const matches = (item: PickerItem) =>
    q === "" ||
    normalizeSearch(item.name).includes(q) ||
    normalizeSearch(item.place ?? "").includes(q);

  const filteredRecent = recentItems.filter(matches);
  const filteredCatalog = catalogItems.filter(matches);

  return {
    query,
    setQuery,
    recentItems: filteredRecent,
    catalogItems: filteredCatalog,
    isEmpty: recentItems.length === 0 && catalogItems.length === 0,
  };
}
