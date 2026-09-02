"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { resolveExerciseCatalog } from "@/lib/data/exerciseCatalog";
import {
  deleteRoutineExercise,
  deleteSlot,
  getTodaysRoutine,
  reorderRoutineExercises,
  saveRoutineExercise,
  saveSlot,
} from "@/lib/data/routine";
import { getOrCreateWorkout } from "@/lib/data/workouts";
import { requireUser } from "@/lib/session";
import { dayString } from "@/lib/validation";
import { newId } from "@/lib/utils";

const { workout_exercises } = schema;

function revalidateRoutine() {
  revalidatePath("/routine");
  revalidatePath("/workout");
}

const saveSlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  label: z.string().trim().min(1).max(60),
});

export async function saveSlotAction(input: unknown) {
  const user = await requireUser();
  const data = saveSlotSchema.parse(input);
  await saveSlot(user.id, data);
  revalidateRoutine();
}

const deleteSlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
});

export async function deleteSlotAction(input: unknown) {
  const user = await requireUser();
  const { weekday } = deleteSlotSchema.parse(input);
  await deleteSlot(user.id, weekday);
  revalidateRoutine();
}

const saveRoutineExerciseSchema = z.object({
  id: z.string().min(1).optional(),
  label: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(120),
  exercise_catalog_id: z.string().min(1).optional().nullable(),
  sort: z.number().int().min(0).optional(),
  target_sets: z.number().int().min(1).max(20).optional(),
  target_reps: z.number().int().min(1).max(100).optional(),
  current_weight: z.number().min(0).max(2000).optional().nullable(),
  per_side: z.boolean().optional(),
  increment_kg: z.number().min(0.25).max(100).optional(),
});

export async function saveRoutineExerciseAction(input: unknown) {
  const user = await requireUser();
  const data = saveRoutineExerciseSchema.parse(input);
  const resolved = await resolveExerciseCatalog(
    data.name,
    data.exercise_catalog_id,
  );
  await saveRoutineExercise(user.id, {
    ...data,
    name: resolved.name,
    exercise_catalog_id: resolved.catalogId,
  });
  revalidateRoutine();
}

const deleteRoutineExerciseSchema = z.object({ id: z.string().min(1) });

export async function deleteRoutineExerciseAction(input: unknown) {
  const user = await requireUser();
  const { id } = deleteRoutineExerciseSchema.parse(input);
  await deleteRoutineExercise(user.id, id);
  revalidateRoutine();
}

const reorderSchema = z.object({
  order: z
    .array(z.object({ id: z.string().min(1), sort: z.number().int().min(0) }))
    .min(1),
});

export async function reorderRoutineExercisesAction(input: unknown) {
  const user = await requireUser();
  const { order } = reorderSchema.parse(input);
  await reorderRoutineExercises(user.id, order);
  revalidateRoutine();
}

const startFromRoutineSchema = z.object({ day: dayString });

export async function startFromRoutine(input: unknown): Promise<string> {
  const user = await requireUser();
  const { day } = startFromRoutineSchema.parse(input);

  const routine = await getTodaysRoutine(user.id, day);
  if (!routine.label || routine.exercises.length === 0) {
    throw new Error("No routine set for today");
  }

  const workout = await getOrCreateWorkout(db, user.id, day, routine.label);

  const existing = await db
    .select({ id: workout_exercises.id })
    .from(workout_exercises)
    .where(eq(workout_exercises.workout_id, workout.id));

  if (existing.length === 0) {
    const rows = await Promise.all(
      routine.exercises.map(async (exercise, index) => {
        const resolved = await resolveExerciseCatalog(exercise.name);
        return {
          id: newId(),
          workout_id: workout.id,
          user_id: user.id,
          name: resolved.name,
          sort: index,
          exercise_catalog_id: resolved.catalogId,
        };
      }),
    );
    await db.insert(workout_exercises).values(rows);
  }

  revalidatePath("/workout");
  return workout.id;
}
