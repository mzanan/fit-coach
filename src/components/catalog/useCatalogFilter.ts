"use client";

import { useMemo, useState } from "react";

import type { CatalogItemFull } from "@/lib/data/catalog";
import { normalizeSearch } from "@/lib/search";

export type QualityFilter = "all" | "clean" | "oily";

export function useCatalogFilter(items: CatalogItemFull[]) {
  const [query, setQuery] = useState("");
  const [quality, setQuality] = useState<QualityFilter>("all");

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return items.filter((item) => {
      const matchesQuery =
        q === "" ||
        normalizeSearch(item.name).includes(q) ||
        normalizeSearch(item.place ?? "").includes(q);
      const matchesQuality =
        quality === "all" ? true : item.fat_quality === quality;
      return matchesQuery && matchesQuality;
    });
  }, [items, query, quality]);

  const isFiltering = query.trim() !== "" || quality !== "all";

  function clear() {
    setQuery("");
    setQuality("all");
  }

  return { query, setQuery, quality, setQuality, filtered, isFiltering, clear };
}
