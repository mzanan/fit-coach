"use client";

import { useState } from "react";

import { addExercise } from "@/lib/actions/workouts";
import { normalizeSearch } from "@/lib/search";
import { useAction } from "@/hooks/useAction";

export function useAddExercise({
  workoutId,
  existingNames,
}: {
  workoutId: string;
  existingNames: string[];
}) {
  const { run } = useAction();
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string[]>([]);

  const addedKeys = new Set(
    [...existingNames, ...justAdded].map((n) => normalizeSearch(n)),
  );

  function isAdded(name: string) {
    return addedKeys.has(normalizeSearch(name));
  }

  function add(name: string, catalogId?: string) {
    const trimmed = name.trim();
    if (!trimmed || addingKey) return;
    setAddingKey(catalogId ?? normalizeSearch(trimmed));
    run(
      async () => {
        try {
          return await addExercise({ workoutId, name: trimmed, exerciseCatalogId: catalogId });
        } finally {
          setAddingKey(null);
        }
      },
      { onDone: () => setJustAdded((prev) => [...prev, trimmed]) },
    );
  }

  return { add, isAdded, addingKey };
}
