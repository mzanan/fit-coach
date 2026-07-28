"use client";

import { useMemo, useState } from "react";

import { addExercise } from "@/lib/actions/workouts";
import type { ExerciseCatalogOption } from "@/lib/data/exerciseCatalog";
import { formatExerciseMeta } from "@/lib/exercises";
import { normalizeSearch } from "@/lib/search";
import { useAction } from "@/hooks/useAction";

export interface ExerciseSuggestion {
  name: string;
  catalogId?: string;
  gifPath?: string;
  meta?: string;
}

const MAX_SEARCH_SUGGESTIONS = 6;
const MAX_RECENT_SUGGESTIONS = 4;

export function useAddExercise({
  workoutId,
  names,
  existingNames,
  catalogOptions,
}: {
  workoutId: string;
  names: string[];
  existingNames: string[];
  catalogOptions: ExerciseCatalogOption[];
}) {
  const [name, setName] = useState("");
  const { pending, run } = useAction();

  const suggestions = useMemo<ExerciseSuggestion[]>(() => {
    const existing = new Set(existingNames.map(normalizeSearch));
    const available = names.filter((n) => !existing.has(normalizeSearch(n)));
    const q = normalizeSearch(name);

    if (q === "") {
      return available.slice(0, MAX_RECENT_SUGGESTIONS).map((n) => ({ name: n }));
    }

    const starts = available.filter((n) => normalizeSearch(n).startsWith(q));
    const contains = available.filter(
      (n) => !normalizeSearch(n).startsWith(q) && normalizeSearch(n).includes(q),
    );
    const recent = [...starts, ...contains]
      .slice(0, MAX_SEARCH_SUGGESTIONS)
      .map((n) => ({ name: n }));

    const seen = new Set(recent.map((s) => normalizeSearch(s.name)));
    const catalogMatches = catalogOptions
      .filter(
        (o) => !existing.has(normalizeSearch(o.name)) && !seen.has(normalizeSearch(o.name)),
      )
      .filter((o) => normalizeSearch(o.name).includes(q))
      .slice(0, MAX_SEARCH_SUGGESTIONS - recent.length)
      .map((o) => ({
        name: o.name,
        catalogId: o.id,
        gifPath: o.gif_path,
        meta: formatExerciseMeta(o.equipment, o.target),
      }));

    return [...recent, ...catalogMatches];
  }, [name, names, existingNames, catalogOptions]);

  function add(suggestion: ExerciseSuggestion) {
    if (!suggestion.name.trim() || pending) return;
    run(
      () =>
        addExercise({
          workoutId,
          name: suggestion.name,
          exerciseCatalogId: suggestion.catalogId,
        }),
      { onDone: () => setName("") },
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    add({ name });
  }

  return { name, setName, pending, suggestions, add, submit };
}
