import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { RoutineVersion } from "@/lib/db/schema";
import { resolveExerciseCatalog } from "@/lib/data/exerciseCatalog";
import type { WorkoutExecutor as DbExecutor } from "@/lib/data/workouts";
import type { RoutineInput } from "@/lib/history/schemas";
import {
  findLiveExercise,
  routineExerciseKey,
  sortWithinLabel,
  toRoutineSnapshot,
  toSnapshotExercise,
  type LiveRoutineExercise,
  type RoutineSnapshot,
} from "@/lib/routineSnapshot";
import { newId } from "@/lib/utils";

const { routine_slots, routine_exercises, routine_versions } = schema;

async function liveRoutine(
  executor: DbExecutor,
  userId: string,
): Promise<{ snapshot: RoutineSnapshot; exercises: LiveRoutineExercise[] }> {
  const slots = await executor
    .select({ weekday: routine_slots.weekday, label: routine_slots.label })
    .from(routine_slots)
    .where(eq(routine_slots.user_id, userId))
    .orderBy(asc(routine_slots.weekday));
  const exercises = await executor
    .select({
      label: routine_exercises.label,
      name: routine_exercises.name,
      exercise_catalog_id: routine_exercises.exercise_catalog_id,
      sort: routine_exercises.sort,
      target_sets: routine_exercises.target_sets,
      target_reps: routine_exercises.target_reps,
      current_weight: routine_exercises.current_weight,
      per_side: routine_exercises.per_side,
      increment_kg: routine_exercises.increment_kg,
      reps_max: routine_exercises.reps_max,
      target_seconds: routine_exercises.target_seconds,
      rest_seconds: routine_exercises.rest_seconds,
      target_rir: routine_exercises.target_rir,
      notes: routine_exercises.notes,
      active: routine_exercises.active,
      updated_at: routine_exercises.updated_at,
    })
    .from(routine_exercises)
    .where(eq(routine_exercises.user_id, userId))
    .orderBy(asc(routine_exercises.label), asc(routine_exercises.sort));
  return { snapshot: toRoutineSnapshot(slots, exercises), exercises };
}

export async function getCurrentRoutine(userId: string): Promise<RoutineSnapshot> {
  return (await liveRoutine(db, userId)).snapshot;
}

export async function listRoutineVersions(userId: string): Promise<RoutineVersion[]> {
  return db
    .select()
    .from(routine_versions)
    .where(eq(routine_versions.user_id, userId))
    .orderBy(sql`${routine_versions.effective_from} asc nulls first`, asc(routine_versions.created_at));
}

export async function replaceRoutine(
  userId: string,
  today: string,
  input: RoutineInput,
): Promise<{ version: RoutineVersion; previousArchived: boolean }> {
  const resolved = await Promise.all(
    input.exercises.map(async (exercise) => {
      const catalog = await resolveExerciseCatalog(exercise.name, exercise.exercise_catalog_id);
      return { ...exercise, name: catalog.name, exercise_catalog_id: catalog.catalogId };
    }),
  );

  return db.transaction(async (tx) => {
    const live = await liveRoutine(tx, userId);
    const [latest] = await tx
      .select({ id: routine_versions.id })
      .from(routine_versions)
      .where(eq(routine_versions.user_id, userId))
      .orderBy(desc(routine_versions.created_at))
      .limit(1);

    const hasLive = live.snapshot.slots.length > 0 || live.snapshot.exercises.length > 0;
    if (latest) {
      await tx
        .update(routine_versions)
        .set({ final_routine: live.snapshot, ended_on: today })
        .where(eq(routine_versions.id, latest.id));
    } else if (hasLive) {
      await tx.insert(routine_versions).values({
        id: newId(),
        user_id: userId,
        effective_from: input.previous_effective_from ?? null,
        ended_on: today,
        name: input.previous_name ?? "Previous routine",
        reason: "Archived automatically when the next routine replaced it.",
        review_on: null,
        routine: live.snapshot,
        final_routine: live.snapshot,
        created_at: new Date(),
      });
    }

    const now = new Date();
    const occurrences = new Map<string, number>();
    const exercises = sortWithinLabel(resolved).map((exercise) => {
      const key = routineExerciseKey(exercise.label, exercise.name);
      const occurrence = occurrences.get(key) ?? 0;
      occurrences.set(key, occurrence + 1);
      const previous = findLiveExercise(live.exercises, exercise.label, exercise.name, occurrence);
      return {
        ...exercise,
        reps_max: exercise.reps_max === undefined ? (previous?.reps_max ?? null) : exercise.reps_max,
        target_seconds:
          exercise.target_seconds === undefined ? (previous?.target_seconds ?? null) : exercise.target_seconds,
        rest_seconds: exercise.rest_seconds === undefined ? (previous?.rest_seconds ?? null) : exercise.rest_seconds,
        target_rir: exercise.target_rir === undefined ? (previous?.target_rir ?? null) : exercise.target_rir,
        notes: exercise.notes === undefined ? (previous?.notes ?? null) : exercise.notes,
        current_weight:
          exercise.current_weight === undefined ? (previous?.current_weight ?? null) : exercise.current_weight,
        updated_at: previous && exercise.current_weight === undefined ? previous.updated_at : now,
      };
    });

    const routine: RoutineSnapshot = {
      slots: input.slots,
      exercises: exercises.map((exercise) => toSnapshotExercise({ ...exercise, active: true })),
    };
    const [version] = await tx
      .insert(routine_versions)
      .values({
        id: newId(),
        user_id: userId,
        effective_from: today,
        ended_on: null,
        name: input.name,
        reason: input.reason,
        review_on: input.review_on ?? null,
        routine,
        final_routine: null,
        created_at: now,
      })
      .returning();

    await tx.delete(routine_slots).where(eq(routine_slots.user_id, userId));
    await tx.delete(routine_exercises).where(eq(routine_exercises.user_id, userId));
    if (input.slots.length) {
      await tx.insert(routine_slots).values(input.slots.map((slot) => ({ id: newId(), user_id: userId, ...slot })));
    }
    if (exercises.length) {
      await tx.insert(routine_exercises).values(
        exercises.map((exercise) => ({
          id: newId(),
          user_id: userId,
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
          active: true,
          created_at: now,
          updated_at: exercise.updated_at,
        })),
      );
    }
    return { version, previousArchived: !latest && hasLive };
  });
}
