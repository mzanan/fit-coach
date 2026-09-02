import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { RoutineExercise, RoutineSlot } from "@/lib/db/schema";
import { getExerciseSessions, getWorkoutForDay } from "@/lib/data/workouts";
import { normalizeSearch } from "@/lib/search";
import { nextWeight, todaysLabel } from "@/lib/routine";
import { logicalDayOf, type DayConfig } from "@/lib/dates";
import { newId } from "@/lib/utils";
import { formatSetLine, PROGRESSION_SESSIONS_REQUIRED } from "@/lib/workoutHistory";

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
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ label: routine_slots.label })
      .from(routine_slots)
      .where(
        and(eq(routine_slots.user_id, userId), eq(routine_slots.weekday, input.weekday)),
      )
      .limit(1);

    await tx
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

    if (!existing || existing.label === input.label) return;

    const [stillUsed] = await tx
      .select({ weekday: routine_slots.weekday })
      .from(routine_slots)
      .where(and(eq(routine_slots.user_id, userId), eq(routine_slots.label, existing.label)))
      .limit(1);
    if (stillUsed) return;

    await tx
      .update(routine_exercises)
      .set({ label: input.label, updated_at: new Date() })
      .where(
        and(
          eq(routine_exercises.user_id, userId),
          eq(routine_exercises.label, existing.label),
        ),
      );
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

async function priorSessions(
  userId: string,
  exerciseName: string,
  day: string,
  limit: number,
) {
  const sessions = await getExerciseSessions(userId, exerciseName, limit + 1);
  return sessions.filter((session) => session.day !== day).slice(0, limit);
}

export interface RoutineExerciseView {
  id: string;
  name: string;
  target_sets: number;
  target_reps: number;
  current_weight: number | null;
  per_side: boolean;
  prescribed_weight: number | null;
  raise: boolean;
  reason: string;
  last: string;
}

export interface TodaysRoutine {
  label: string | null;
  exercises: RoutineExerciseView[];
}

export async function getTodaysRoutine(
  userId: string,
  day: string,
): Promise<TodaysRoutine> {
  const slots = await listSlots(userId);
  const label = todaysLabel(slots, day);
  if (!label) return { label: null, exercises: [] };

  const exercises = await listRoutineExercises(userId, label);
  const withProgression = await Promise.all(
    exercises.map(async (exercise) => {
      const sessions = await priorSessions(
        userId,
        exercise.name,
        day,
        PROGRESSION_SESSIONS_REQUIRED,
      );
      const result = nextWeight(exercise, sessions);
      return {
        id: exercise.id,
        name: exercise.name,
        target_sets: exercise.target_sets,
        target_reps: exercise.target_reps,
        current_weight: exercise.current_weight,
        per_side: exercise.per_side,
        prescribed_weight: result.weight,
        raise: result.raise,
        reason: result.reason,
        last: formatSetLine(sessions[0]?.sets ?? []),
      };
    }),
  );

  return { label, exercises: withProgression };
}

export async function applyProgression(
  userId: string,
  day: string,
  label: string,
  cfg: DayConfig,
): Promise<void> {
  const [exercises, workout] = await Promise.all([
    listRoutineExercises(userId, label),
    getWorkoutForDay(userId, day),
  ]);
  if (!workout) return;

  const loggedByName = new Map<string, { weight: number | null }[]>();
  for (const exercise of workout.exercises) {
    const key = normalizeSearch(exercise.name);
    const sets = loggedByName.get(key) ?? [];
    sets.push(...exercise.sets.map((set) => ({ weight: set.weight })));
    loggedByName.set(key, sets);
  }

  for (const exercise of exercises) {
    if (logicalDayOf(exercise.updated_at, cfg) === day) continue;

    const loggedSets = loggedByName.get(normalizeSearch(exercise.name));
    if (!loggedSets || loggedSets.length === 0) continue;

    const sessions = await priorSessions(
      userId,
      exercise.name,
      day,
      PROGRESSION_SESSIONS_REQUIRED,
    );
    const result = nextWeight(exercise, sessions);
    if (!result.raise || result.weight == null) continue;

    const usedPrescribedWeight = loggedSets.some(
      (set) => set.weight === result.weight,
    );
    if (!usedPrescribedWeight) continue;

    await db
      .update(routine_exercises)
      .set({ current_weight: result.weight, updated_at: new Date() })
      .where(
        and(
          eq(routine_exercises.id, exercise.id),
          eq(routine_exercises.user_id, userId),
        ),
      );
  }
}
