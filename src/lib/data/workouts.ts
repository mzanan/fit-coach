import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type {
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from "@/lib/db/schema";

const { workouts, workout_exercises, workout_sets } = schema;

export interface ExerciseFull extends WorkoutExercise {
  sets: WorkoutSet[];
}

export interface WorkoutFull extends Workout {
  exercises: ExerciseFull[];
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
