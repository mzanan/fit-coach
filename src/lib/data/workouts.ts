import "server-only";

import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type {
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from "@/lib/db/schema";
import { resolveExerciseCatalog } from "@/lib/data/exerciseCatalog";
import { formatExerciseMeta } from "@/lib/exercises";
import { normalizeSearch } from "@/lib/search";
import { newId } from "@/lib/utils";
import { topSet, type HistorySet } from "@/lib/workoutHistory";

const { workouts, workout_exercises, workout_sets, exercise_catalog } = schema;

export type WorkoutExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function fetchSetsGroupedByExercise(
  executor: WorkoutExecutor,
  userId: string,
  exerciseIds: string[],
): Promise<Map<string, WorkoutSet[]>> {
  const byEx = new Map<string, WorkoutSet[]>();
  if (!exerciseIds.length) return byEx;
  const sets = await executor
    .select()
    .from(workout_sets)
    .where(
      and(
        eq(workout_sets.user_id, userId),
        inArray(workout_sets.exercise_id, exerciseIds),
      ),
    )
    .orderBy(asc(workout_sets.set_index));
  for (const s of sets) {
    const list = byEx.get(s.exercise_id) ?? [];
    list.push(s);
    byEx.set(s.exercise_id, list);
  }
  return byEx;
}

export interface GetOrCreateWorkoutResult {
  id: string;
  label: string | null;
}

export async function getOrCreateWorkout(
  executor: WorkoutExecutor,
  userId: string,
  day: string,
  label?: string | null,
): Promise<GetOrCreateWorkoutResult> {
  const existing = await executor
    .select()
    .from(workouts)
    .where(and(eq(workouts.user_id, userId), eq(workouts.logical_day, day)))
    .limit(1);

  if (existing[0]) {
    if (label && label !== existing[0].label) {
      await executor
        .update(workouts)
        .set({ label })
        .where(eq(workouts.id, existing[0].id));
      return { id: existing[0].id, label };
    }
    return { id: existing[0].id, label: existing[0].label };
  }

  const id = newId();
  const storedLabel = label?.trim() || null;
  await executor.insert(workouts).values({
    id,
    user_id: userId,
    logical_day: day,
    label: storedLabel,
    created_at: new Date(),
  });
  return { id, label: storedLabel };
}

export interface ExerciseFull extends WorkoutExercise {
  sets: WorkoutSet[];
  gif_path: string | null;
  meta: string | null;
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
  const exerciseRows = await db
    .select({
      exercise: workout_exercises,
      gif_path: exercise_catalog.gif_path,
      equipment: exercise_catalog.equipment,
      target: exercise_catalog.target,
    })
    .from(workout_exercises)
    .leftJoin(
      exercise_catalog,
      eq(workout_exercises.exercise_catalog_id, exercise_catalog.id),
    )
    .where(
      and(
        eq(workout_exercises.user_id, userId),
        eq(workout_exercises.workout_id, workout.id),
      ),
    )
    .orderBy(asc(workout_exercises.sort));

  const exercises = exerciseRows.map((r) => ({
    ...r.exercise,
    gif_path: r.gif_path,
    meta: formatExerciseMeta(r.equipment, r.target) ?? null,
  }));

  const exIds = exercises.map((e) => e.id);
  const byEx = await fetchSetsGroupedByExercise(db, userId, exIds);

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
  const setsByExercise = await fetchSetsGroupedByExercise(
    db,
    userId,
    exerciseIds,
  );

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

export interface WorkoutSessionSetInput {
  reps: number | null;
  weight: number | null;
  per_side: boolean;
}

export interface WorkoutSessionExerciseInput {
  name: string;
  exercise_catalog_id?: string | null;
  sets: WorkoutSessionSetInput[];
  notes?: string;
}

export interface WorkoutSessionInput {
  session_type: string;
  exercises: WorkoutSessionExerciseInput[];
}

export interface ResolvedWorkoutExercise {
  name: string;
  catalogId: string | null;
  notes: string | null;
  sets: WorkoutSessionSetInput[];
}

export interface ResolvedWorkoutSession {
  label: string;
  exercises: ResolvedWorkoutExercise[];
}

export async function resolveWorkoutSession(
  input: WorkoutSessionInput,
): Promise<ResolvedWorkoutSession> {
  const exercises = await Promise.all(
    input.exercises.map(async (exercise) => {
      const resolved = await resolveExerciseCatalog(
        exercise.name,
        exercise.exercise_catalog_id,
      );
      return {
        name: resolved.name,
        catalogId: resolved.catalogId,
        notes: exercise.notes?.trim() || null,
        sets: exercise.sets,
      };
    }),
  );
  return { label: input.session_type.trim(), exercises };
}

export async function insertWorkoutSession(
  userId: string,
  day: string,
  session: ResolvedWorkoutSession,
): Promise<string> {
  return db.transaction(async (tx) => {
    const workout = await getOrCreateWorkout(tx, userId, day, session.label);

    const existingCount = await tx
      .select({ id: workout_exercises.id })
      .from(workout_exercises)
      .where(eq(workout_exercises.workout_id, workout.id));
    let sort = existingCount.length;

    const exerciseRows = session.exercises.map((exercise) => ({
      id: newId(),
      workout_id: workout.id,
      user_id: userId,
      name: exercise.name,
      sort: sort++,
      notes: exercise.notes,
      exercise_catalog_id: exercise.catalogId,
    }));
    await tx.insert(workout_exercises).values(exerciseRows);

    const setRows = session.exercises.flatMap((exercise, i) =>
      exercise.sets.map((set, index) => ({
        id: newId(),
        exercise_id: exerciseRows[i].id,
        user_id: userId,
        set_index: index + 1,
        reps: set.reps,
        weight: set.weight,
        per_side: set.per_side,
      })),
    );
    if (setRows.length) {
      await tx.insert(workout_sets).values(setRows);
    }

    return workout.id;
  });
}

export interface ExerciseSessionSets {
  day: string;
  sets: HistorySet[];
}

export async function getExerciseSessions(
  userId: string,
  exerciseName: string,
  limit: number,
): Promise<ExerciseSessionSets[]> {
  const key = normalizeSearch(exerciseName);
  const recentWorkouts = await db
    .select({ id: workouts.id, day: workouts.logical_day })
    .from(workouts)
    .where(eq(workouts.user_id, userId))
    .orderBy(desc(workouts.logical_day))
    .limit(60);
  if (!recentWorkouts.length) return [];

  const workoutIds = recentWorkouts.map((w) => w.id);
  const exercises = await db
    .select({
      id: workout_exercises.id,
      workout_id: workout_exercises.workout_id,
      name: workout_exercises.name,
      sort: workout_exercises.sort,
    })
    .from(workout_exercises)
    .where(
      and(
        eq(workout_exercises.user_id, userId),
        inArray(workout_exercises.workout_id, workoutIds),
      ),
    )
    .orderBy(asc(workout_exercises.sort));

  const matching = exercises.filter((e) => normalizeSearch(e.name) === key);

  const byWorkout = new Map<string, (typeof matching)[number]>();
  for (const e of matching) {
    const existing = byWorkout.get(e.workout_id);
    if (!existing || e.sort < existing.sort) byWorkout.set(e.workout_id, e);
  }

  const picked = recentWorkouts
    .filter((w) => byWorkout.has(w.id))
    .slice(0, limit)
    .map((w) => ({ day: w.day, exerciseId: byWorkout.get(w.id)!.id }));

  const exerciseIds = picked.map((p) => p.exerciseId);
  const byExercise = await fetchSetsGroupedByExercise(db, userId, exerciseIds);

  return picked.map((p) => ({
    day: p.day,
    sets: (byExercise.get(p.exerciseId) ?? []).map((s) => ({
      reps: s.reps,
      weight: s.weight,
      per_side: s.per_side,
    })),
  }));
}
