"use client";

import {
  deleteRoutineExerciseAction,
  reorderRoutineExercisesAction,
  saveRoutineExerciseAction,
} from "@/lib/actions/routine";
import type { RoutineExercise } from "@/lib/db/schema";
import { useAction } from "@/hooks/useAction";

export interface RoutineExerciseSaveValues {
  id?: string;
  name: string;
  exercise_catalog_id: string | null;
  target_sets: number;
  target_reps: number;
  current_weight: number | null;
  per_side: boolean;
  increment_kg: number;
}

export function useRoutineExercises(label: string, exercises: RoutineExercise[]) {
  const { pending, run } = useAction();
  const sorted = [...exercises].sort((a, b) => a.sort - b.sort);

  function save(values: RoutineExerciseSaveValues) {
    const existing = values.id ? exercises.find((e) => e.id === values.id) : undefined;
    run(
      () =>
        saveRoutineExerciseAction({
          ...values,
          label,
          sort: values.id ? existing?.sort : sorted.length,
        }),
      { success: "Exercise saved" },
    );
  }

  function remove(id: string) {
    run(() => deleteRoutineExerciseAction({ id }), { success: "Exercise removed" });
  }

  function move(id: string, direction: -1 | 1) {
    const index = sorted.findIndex((e) => e.id === id);
    const swapWith = index + direction;
    if (index === -1 || swapWith < 0 || swapWith >= sorted.length) return;
    const order = sorted.map((e, i) => ({ id: e.id, sort: i }));
    const tmp = order[index].sort;
    order[index].sort = order[swapWith].sort;
    order[swapWith].sort = tmp;
    run(() => reorderRoutineExercisesAction({ order }));
  }

  return { sorted, pending, save, remove, move };
}
