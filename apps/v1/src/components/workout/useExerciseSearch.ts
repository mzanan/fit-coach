"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { searchExercises } from "@/lib/actions/exerciseCatalog";
import type { ExerciseCatalogOption } from "@/lib/data/exerciseCatalog";

const DEBOUNCE_MS = 250;

export interface ExerciseFilters extends Record<string, string | null> {
  target: string | null;
  equipment: string | null;
}

export function useExerciseSearch(enabled: boolean, initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<ExerciseFilters>({ target: null, equipment: null });
  const [items, setItems] = useState<ExerciseCatalogOption[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(
    async (nextQuery: string, nextFilters: ExerciseFilters) => {
      const id = ++requestId.current;
      setLoading(true);
      setFailed(false);
      try {
        const result = await searchExercises({
          query: nextQuery.trim() || undefined,
          target: nextFilters.target ?? undefined,
          equipment: nextFilters.equipment ?? undefined,
        });
        if (id !== requestId.current) return;
        setItems(result.items);
        setHasMore(result.hasMore);
        setTotal(result.total);
      } catch {
        if (id !== requestId.current) return;
        setItems([]);
        setHasMore(false);
        setTotal(0);
        setFailed(true);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadedOnce(true);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    const trimmed = query.trim();
    const timer = setTimeout(
      () => void load(trimmed, filters),
      trimmed === "" ? 0 : DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [enabled, query, filters, load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const result = await searchExercises({
        query: query.trim() || undefined,
        target: filters.target ?? undefined,
        equipment: filters.equipment ?? undefined,
        offset: items.length,
      });
      if (id !== requestId.current) return;
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
      setTotal(result.total);
    } catch {
      if (id === requestId.current) setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [filters, hasMore, items.length, loading, loadingMore, query]);

  function setFilter(groupKey: string, value: string | null) {
    setFilters((prev) => ({ ...prev, [groupKey]: value }));
  }

  function resetFilters() {
    setFilters({ target: null, equipment: null });
  }

  return {
    query,
    setQuery,
    filters,
    setFilter,
    resetFilters,
    items,
    total,
    hasMore,
    loading,
    loadingMore,
    failed,
    loadedOnce,
    loadMore,
    retry: () => void load(query.trim(), filters),
  };
}
