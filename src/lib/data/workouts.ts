import "server-only";

import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type {
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from "@/lib/db/schema";
import { normalizeSearch } from "@/lib/search";
import { topSet, type HistorySet } from "@/lib/workoutHistory";

const { workouts, workout_exercises, workout_sets } = schema;

export interface ExerciseFull extends WorkoutExercise {
  sets: WorkoutSet[];
}

export interface WorkoutFull extends Workout {
  exercises: ExerciseFull[];
}

export interface LastPerformance {
  day: string;
  displayName: string;
  sets: HistorySet[];
  top: HistorySet | null;
}

export interface WorkoutHistory {
  lastByName: Record<string, LastPerformance>;
  names: string[];
  lastLabel: string | null;
}

export async function getWorkoutForDay(
  userId: string,
  day: string,
): Promise<WorkoutFull | null> {
  const w = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.user_id, userId), eq(workouts.logical_day, day)))
    .limit(1);
  if (!w[0]) return null;

  return hydrateWorkout(userId, w[0]);
}

export async function hydrateWorkout(
  userId: string,
  workout: Workout,
): Promise<WorkoutFull> {
  const exercises = await db
    .select()
    .from(workout_exercises)
    .where(
      and(
        eq(workout_exercises.user_id, userId),
        eq(workout_exercises.workout_id, workout.id),
      ),
    )
    .orderBy(asc(workout_exercises.sort));

  const exIds = exercises.map((e) => e.id);
  const sets = exIds.length
    ? await db
        .select()
        .from(workout_sets)
        .where(
          and(
            eq(workout_sets.user_id, userId),
            inArray(workout_sets.exercise_id, exIds),
          ),
        )
        .orderBy(asc(workout_sets.set_index))
    : [];

  const byEx = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    const list = byEx.get(s.exercise_id) ?? [];
    list.push(s);
    byEx.set(s.exercise_id, list);
  }

  return {
    ...workout,
    exercises: exercises.map((e) => ({ ...e, sets: byEx.get(e.id) ?? [] })),
  };
}

export async function getRecentWorkouts(
  userId: string,
  limit = 10,
): Promise<Workout[]> {
  return db
    .select()
    .from(workouts)
    .where(eq(workouts.user_id, userId))
    .orderBy(desc(workouts.logical_day))
    .limit(limit);
}

export async function getWorkoutHistory(
  userId: string,
  beforeDay: string,
): Promise<WorkoutHistory> {
  const pastWorkouts = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.user_id, userId), lt(workouts.logical_day, beforeDay)))
    .orderBy(desc(workouts.logical_day))
    .limit(60);

  const lastLabel = pastWorkouts[0]?.label ?? null;
  if (pastWorkouts.length === 0) {
    return { lastByName: {}, names: [], lastLabel: null };
  }

  const workoutIds = pastWorkouts.map((w) => w.id);
  const exercises = await db
    .select()
    .from(workout_exercises)
    .where(
      and(
        eq(workout_exercises.user_id, userId),
        inArray(workout_exercises.workout_id, workoutIds),
      ),
    )
    .orderBy(asc(workout_exercises.sort));

  const exerciseIds = exercises.map((e) => e.id);
  const sets = exerciseIds.length
    ? await db
        .select()
        .from(workout_sets)
        .where(
          and(
            eq(workout_sets.user_id, userId),
            inArray(workout_sets.exercise_id, exerciseIds),
          ),
        )
        .orderBy(asc(workout_sets.set_index))
    : [];

  const setsByExercise = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    const list = setsByExercise.get(s.exercise_id) ?? [];
    list.push(s);
    setsByExercise.set(s.exercise_id, list);
  }

  const exercisesByWorkout = new Map<string, WorkoutExercise[]>();
  for (const e of exercises) {
    const list = exercisesByWorkout.get(e.workout_id) ?? [];
    list.push(e);
    exercisesByWorkout.set(e.workout_id, list);
  }

  const lastByName = new Map<string, LastPerformance>();
  const nameFrequency = new Map<
    string,
    { count: number; displayName: string; lastSeen: string }
  >();

  for (const w of pastWorkouts) {
    const exs = exercisesByWorkout.get(w.id) ?? [];
    const byNormalizedInWorkout = new Map<string, WorkoutExercise>();

    for (const ex of exs) {
      const key = normalizeSearch(ex.name);
      const freq = nameFrequency.get(key);
      if (freq) {
        freq.count += 1;
      } else {
        nameFrequency.set(key, {
          count: 1,
          displayName: ex.name,
          lastSeen: w.logical_day,
        });
      }

      const existing = byNormalizedInWorkout.get(key);
      if (!existing) {
        byNormalizedInWorkout.set(key, ex);
      } else {
        const existingSets = setsByExercise.get(existing.id) ?? [];
        const currentSets = setsByExercise.get(ex.id) ?? [];
        if (
          currentSets.length > existingSets.length ||
          (currentSets.length === existingSets.length && ex.sort < existing.sort)
        ) {
          byNormalizedInWorkout.set(key, ex);
        }
      }
    }

    for (const [key, ex] of byNormalizedInWorkout) {
      if (lastByName.has(key)) continue;
      const exSets = setsByExercise.get(ex.id) ?? [];
      if (exSets.length === 0) continue;
      const historySets: HistorySet[] = exSets.map((s) => ({
        reps: s.reps,
        weight: s.weight,
        per_side: s.per_side,
      }));
      lastByName.set(key, {
        day: w.logical_day,
        displayName: ex.name,
        sets: historySets,
        top: topSet(historySets),
      });
    }
  }

  const names = [...nameFrequency.entries()]
    .sort((a, b) => {
      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
      return b[1].lastSeen.localeCompare(a[1].lastSeen);
    })
    .slice(0, 24)
    .map(([, v]) => v.displayName);

  return { lastByName: Object.fromEntries(lastByName), names, lastLabel };
}
