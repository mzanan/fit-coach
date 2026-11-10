type Row = Record<string, unknown>;

export interface NormalizedWorkouts {
  workouts: Row[];
  workout_exercises: Row[];
}

export function referencedExerciseCatalogIds(exercises: Row[]): string[] {
  return [
    ...new Set(
      exercises
        .map((e) => e.exercise_catalog_id)
        .filter((id): id is string => typeof id === "string" && id !== ""),
    ),
  ];
}

export function normalizeBackupWorkouts(
  workouts: Row[],
  exercises: Row[],
  knownCatalogIds: ReadonlySet<string>,
): NormalizedWorkouts {
  const ordered = [...workouts].sort((a, b) =>
    String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")),
  );
  const keptByDay = new Map<string, string>();
  const remap = new Map<string, string>();
  const kept: Row[] = [];

  for (const workout of ordered) {
    const day = String(workout.logical_day);
    const id = String(workout.id);
    const existing = keptByDay.get(day);
    if (existing) {
      remap.set(id, existing);
      continue;
    }
    keptByDay.set(day, id);
    kept.push(workout);
  }

  return {
    workouts: kept,
    workout_exercises: exercises.map((exercise) => {
      const workoutId = String(exercise.workout_id);
      const catalogId = exercise.exercise_catalog_id;
      return {
        ...exercise,
        workout_id: remap.get(workoutId) ?? workoutId,
        exercise_catalog_id:
          typeof catalogId === "string" && knownCatalogIds.has(catalogId) ? catalogId : null,
      };
    }),
  };
}
