import { normalizeSearch } from "@/lib/search";

export interface RoutineSnapshotSlot {
  weekday: number;
  label: string;
}

export interface RoutineSnapshotExercise {
  label: string;
  name: string;
  exercise_catalog_id: string | null;
  sort: number;
  target_sets: number;
  target_reps: number;
  current_weight: number | null;
  per_side: boolean;
  increment_kg: number;
  reps_max: number | null;
  target_seconds: number | null;
  rest_seconds: number | null;
  target_rir: number | null;
  notes: string | null;
  active: boolean;
}

export interface RoutineSnapshot {
  slots: RoutineSnapshotSlot[];
  exercises: RoutineSnapshotExercise[];
}

export interface LiveRoutineExercise extends RoutineSnapshotExercise {
  updated_at: Date;
}

type DetailKey = "reps_max" | "target_seconds" | "rest_seconds" | "target_rir" | "notes";

type SnapshotSource = Omit<RoutineSnapshotExercise, DetailKey> & {
  [K in DetailKey]?: RoutineSnapshotExercise[K] | undefined;
};

export function toSnapshotExercise(exercise: SnapshotSource): RoutineSnapshotExercise {
  return {
    label: exercise.label,
    name: exercise.name,
    exercise_catalog_id: exercise.exercise_catalog_id,
    sort: exercise.sort,
    target_sets: exercise.target_sets,
    target_reps: exercise.target_reps,
    current_weight: exercise.current_weight,
    per_side: exercise.per_side,
    increment_kg: exercise.increment_kg,
    reps_max: exercise.reps_max ?? null,
    target_seconds: exercise.target_seconds ?? null,
    rest_seconds: exercise.rest_seconds ?? null,
    target_rir: exercise.target_rir ?? null,
    notes: exercise.notes ?? null,
    active: exercise.active,
  };
}

export function toRoutineSnapshot(
  slots: RoutineSnapshotSlot[],
  exercises: LiveRoutineExercise[],
): RoutineSnapshot {
  return {
    slots: slots.map(({ weekday, label }) => ({ weekday, label })),
    exercises: exercises.map(toSnapshotExercise),
  };
}

export function sortWithinLabel<T extends { label: string }>(items: T[]): (T & { sort: number })[] {
  const next = new Map<string, number>();
  return items.map((item) => {
    const sort = next.get(item.label) ?? 0;
    next.set(item.label, sort + 1);
    return { ...item, sort };
  });
}

export function routineExerciseKey(label: string, name: string): string {
  return `${normalizeSearch(label)}::${normalizeSearch(name)}`;
}

export function findLiveExercise<T extends { label: string; name: string }>(
  live: T[],
  label: string,
  name: string,
  occurrence: number,
): T | undefined {
  const key = routineExerciseKey(label, name);
  const sameSession = live.filter((exercise) => routineExerciseKey(exercise.label, exercise.name) === key);
  if (sameSession.length) return sameSession[occurrence];
  const target = normalizeSearch(name);
  const sameName = live.filter((exercise) => normalizeSearch(exercise.name) === target);
  if (sameName.length !== 1) return undefined;
  return sameName[0];
}
