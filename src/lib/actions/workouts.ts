"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { resolveExerciseCatalog } from "@/lib/data/exerciseCatalog";
import { getOrCreateWorkout } from "@/lib/data/workouts";
import { requireUser } from "@/lib/session";
import { dayString } from "@/lib/validation";
import { newId } from "@/lib/utils";

const { workouts, workout_exercises, workout_sets } = schema;

const createWorkoutSchema = z.object({
  day: dayString,
  label: z.string().optional(),
});

export async function ensureWorkout(input: unknown): Promise<string> {
  const user = await requireUser();
  const { day, label } = createWorkoutSchema.parse(input);

  const result = await getOrCreateWorkout(db, user.id, day, label);
  revalidatePath("/workout");
  return result.id;
}

async function ownsWorkout(userId: string, workoutId: string) {
  const w = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.user_id, userId)))
    .limit(1);
  return Boolean(w[0]);
}

const addExerciseSchema = z.object({
  workoutId: z.string().min(1),
  name: z.string().min(1),
  exerciseCatalogId: z.string().min(1).optional(),
});

export async function addExercise(input: unknown) {
  const user = await requireUser();
  const { workoutId, name, exerciseCatalogId } = addExerciseSchema.parse(input);
  if (!(await ownsWorkout(user.id, workoutId))) throw new Error("Not found");

  const resolved = await resolveExerciseCatalog(name, exerciseCatalogId);

  const count = await db
    .select({ id: workout_exercises.id })
    .from(workout_exercises)
    .where(eq(workout_exercises.workout_id, workoutId));

  await db.insert(workout_exercises).values({
    id: newId(),
    workout_id: workoutId,
    user_id: user.id,
    name: resolved.name,
    sort: count.length,
    exercise_catalog_id: resolved.catalogId,
  });
  revalidatePath("/workout");
}

const setSchema = z.object({
  exerciseId: z.string().min(1),
  reps: z.number().int().min(0).max(1000).nullable(),
  weight: z.number().min(0).max(2000).nullable(),
  per_side: z.boolean(),
});

export async function addSet(input: unknown) {
  const user = await requireUser();
  const { exerciseId, reps, weight, per_side } = setSchema.parse(input);

  const ex = await db
    .select({ id: workout_exercises.id })
    .from(workout_exercises)
    .where(
      and(
        eq(workout_exercises.id, exerciseId),
        eq(workout_exercises.user_id, user.id),
      ),
    )
    .limit(1);
  if (!ex[0]) throw new Error("Not found");

  const [{ maxIndex }] = await db
    .select({ maxIndex: max(workout_sets.set_index) })
    .from(workout_sets)
    .where(eq(workout_sets.exercise_id, exerciseId));

  await db.insert(workout_sets).values({
    id: newId(),
    exercise_id: exerciseId,
    user_id: user.id,
    set_index: (maxIndex ?? 0) + 1,
    reps,
    weight,
    per_side,
  });
  revalidatePath("/workout");
}

export async function toggleSetPr(id: string) {
  const user = await requireUser();
  const row = await db
    .select()
    .from(workout_sets)
    .where(and(eq(workout_sets.id, id), eq(workout_sets.user_id, user.id)))
    .limit(1);
  if (!row[0]) throw new Error("Not found");
  await db
    .update(workout_sets)
    .set({ is_pr: !row[0].is_pr })
    .where(eq(workout_sets.id, id));
  revalidatePath("/workout");
}

export async function deleteSet(id: string) {
  const user = await requireUser();
  await db
    .delete(workout_sets)
    .where(and(eq(workout_sets.id, id), eq(workout_sets.user_id, user.id)));
  revalidatePath("/workout");
}

export async function deleteExercise(id: string) {
  const user = await requireUser();
  await db
    .delete(workout_exercises)
    .where(
      and(
        eq(workout_exercises.id, id),
        eq(workout_exercises.user_id, user.id),
      ),
    );
  revalidatePath("/workout");
}

export async function deleteWorkout(id: string) {
  const user = await requireUser();
  await db
    .delete(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.user_id, user.id)));
  revalidatePath("/workout");
}
