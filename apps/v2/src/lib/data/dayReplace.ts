import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { insertWorkoutSession, resolveWorkoutSession } from "@/lib/data/workouts";
import { resolveDayType } from "@/lib/dayType";
import type { ReplaceDayInput } from "@/lib/history/schemas";
import { historicalCreatedAt } from "@/lib/historyDay";
import { newId } from "@/lib/utils";

const { meals, workouts, days, catalog_items, routine_slots } = schema;

export async function replaceDay(
  userId: string,
  input: ReplaceDayInput,
): Promise<{ meals: number; workoutReplaced: boolean; dayType: string }> {
  const resolvedWorkout = input.workout
    ? await resolveWorkoutSession({
        session_type: input.workout.session_type,
        notes: input.workout.notes,
        exercises: input.workout.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set) => ({ ...set, per_side: set.per_side ?? false })),
        })),
      })
    : null;

  const catalogIds = input.meals.flatMap((meal) => (meal.catalog_item_id ? [meal.catalog_item_id] : []));
  const ownedCatalogIds = new Set(
    catalogIds.length
      ? (
          await db
            .select({ id: catalog_items.id })
            .from(catalog_items)
            .where(and(eq(catalog_items.user_id, userId), inArray(catalog_items.id, catalogIds)))
        ).map((row) => row.id)
      : [],
  );

  return db.transaction(async (tx) => {
    const requestedType = input.day_type ?? (input.workout ? "gym" : undefined);
    const slots = requestedType
      ? []
      : await tx
          .select({ weekday: routine_slots.weekday })
          .from(routine_slots)
          .where(eq(routine_slots.user_id, userId));
    await tx
      .insert(days)
      .values({
        id: newId(),
        user_id: userId,
        logical_day: input.day,
        day_type: requestedType ?? resolveDayType({ dayRow: null, slots, day: input.day }),
        created_at: new Date(),
      })
      .onConflictDoNothing({ target: [days.user_id, days.logical_day] });
    const [dayRow] = await tx
      .select({ id: days.id, day_type: days.day_type })
      .from(days)
      .where(and(eq(days.user_id, userId), eq(days.logical_day, input.day)))
      .for("update");
    if (requestedType && dayRow.day_type !== requestedType) {
      await tx.update(days).set({ day_type: requestedType }).where(eq(days.id, dayRow.id));
    }

    await tx.delete(meals).where(and(eq(meals.user_id, userId), eq(meals.logical_day, input.day)));
    if (input.meals.length) {
      await tx.insert(meals).values(
        input.meals.map((meal, index) => ({
          id: newId(),
          user_id: userId,
          logical_day: input.day,
          category: meal.category,
          name: meal.name,
          place: meal.place ?? null,
          protein_g: meal.protein_g,
          fat_g: meal.fat_g,
          carbs_g: meal.carbs_g,
          alcohol_g: meal.alcohol_g,
          fat_quality: meal.fat_quality ?? null,
          catalog_item_id:
            meal.catalog_item_id && ownedCatalogIds.has(meal.catalog_item_id) ? meal.catalog_item_id : null,
          created_at: historicalCreatedAt(input.day, index),
        })),
      );
    }

    if (resolvedWorkout) {
      await tx.delete(workouts).where(and(eq(workouts.user_id, userId), eq(workouts.logical_day, input.day)));
      await insertWorkoutSession(userId, input.day, resolvedWorkout, tx);
    }

    return {
      meals: input.meals.length,
      workoutReplaced: Boolean(resolvedWorkout),
      dayType: requestedType ?? dayRow.day_type,
    };
  });
}

