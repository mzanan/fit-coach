import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { RoutineExercise, RoutineSlot } from "@/lib/db/schema";
import { newId } from "@/lib/utils";

const { routine_slots, routine_exercises } = schema;

export async function listSlots(userId: string): Promise<RoutineSlot[]> {
  return db
    .select()
    .from(routine_slots)
    .where(eq(routine_slots.user_id, userId))
    .orderBy(asc(routine_slots.weekday));
}

export interface SaveSlotInput {
  weekday: number;
  label: string;
}

export async function saveSlot(userId: string, input: SaveSlotInput): Promise<void> {
  await db
    .insert(routine_slots)
    .values({
      id: newId(),
      user_id: userId,
      weekday: input.weekday,
      label: input.label,
    })
    .onConflictDoUpdate({
      target: [routine_slots.user_id, routine_slots.weekday],
      set: { label: input.label },
    });
}

export async function deleteSlot(userId: string, weekday: number): Promise<void> {
  await db
    .delete(routine_slots)
    .where(
      and(eq(routine_slots.user_id, userId), eq(routine_slots.weekday, weekday)),
    );
}

export async function listRoutineExercises(
  userId: string,
  label: string,
): Promise<RoutineExercise[]> {
  return db
    .select()
    .from(routine_exercises)
    .where(
      and(
        eq(routine_exercises.user_id, userId),
        eq(routine_exercises.label, label),
        eq(routine_exercises.active, true),
      ),
    )
    .orderBy(asc(routine_exercises.sort));
}

export interface SaveRoutineExerciseInput {
  id?: string;
  label: string;
  name: string;
  exercise_catalog_id?: string | null;
  sort?: number;
  target_sets?: number;
  target_reps?: number;
  current_weight?: number | null;
  per_side?: boolean;
  increment_kg?: number;
}

export async function saveRoutineExercise(
  userId: string,
  input: SaveRoutineExerciseInput,
): Promise<RoutineExercise> {
  const now = new Date();
  const values = {
    label: input.label,
    name: input.name,
    exercise_catalog_id: input.exercise_catalog_id ?? null,
    sort: input.sort ?? 0,
    target_sets: input.target_sets ?? 3,
    target_reps: input.target_reps ?? 8,
    current_weight: input.current_weight ?? null,
    per_side: input.per_side ?? false,
    increment_kg: input.increment_kg ?? 2.5,
  };

  if (input.id) {
    await db
      .update(routine_exercises)
      .set({ ...values, updated_at: now })
      .where(
        and(
          eq(routine_exercises.id, input.id),
          eq(routine_exercises.user_id, userId),
        ),
      );
    const [row] = await db
      .select()
      .from(routine_exercises)
      .where(eq(routine_exercises.id, input.id))
      .limit(1);
    if (!row) throw new Error("Routine exercise not found after update");
    return row;
  }

  const id = newId();
  await db.insert(routine_exercises).values({
    id,
    user_id: userId,
    ...values,
    active: true,
    created_at: now,
    updated_at: now,
  });
  const [row] = await db
    .select()
    .from(routine_exercises)
    .where(eq(routine_exercises.id, id))
    .limit(1);
  if (!row) throw new Error("Routine exercise not found after insert");
  return row;
}

export async function deleteRoutineExercise(
  userId: string,
  id: string,
): Promise<void> {
  await db
    .delete(routine_exercises)
    .where(
      and(eq(routine_exercises.id, id), eq(routine_exercises.user_id, userId)),
    );
}

export async function reorderRoutineExercises(
  userId: string,
  order: { id: string; sort: number }[],
): Promise<void> {
  await Promise.all(
    order.map(({ id, sort }) =>
      db
        .update(routine_exercises)
        .set({ sort })
        .where(
          and(eq(routine_exercises.id, id), eq(routine_exercises.user_id, userId)),
        ),
    ),
  );
}
