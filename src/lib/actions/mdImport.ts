"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { parseISO } from "date-fns";

import { hasAi } from "@/lib/ai/provider";
import {
  extractFromMarkdown,
  mdExtraction,
  type MdExtraction,
} from "@/lib/ai/mdImport";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { newId } from "@/lib/utils";

const {
  meals,
  catalog_items,
  workouts,
  workout_exercises,
  workout_sets,
} = schema;

export async function extractMdImport(text: string): Promise<MdExtraction> {
  await requireUser();
  if (!hasAi()) throw new Error("OPENROUTER_API_KEY or AI_MODEL not set; MD import needs AI");
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Empty markdown");
  return extractFromMarkdown(trimmed);
}

export async function commitMdImport(payload: unknown) {
  const user = await requireUser();
  const data = mdExtraction.parse(payload);

  const existing = await db
    .select({ name: catalog_items.name })
    .from(catalog_items)
    .where(eq(catalog_items.user_id, user.id));
  const existingNames = new Set(existing.map((r) => r.name.trim().toLowerCase()));

  let mealCount = 0;
  let workoutCount = 0;

  for (const day of data.days) {
    const base = parseISO(`${day.day}T12:00:00`).getTime();

    if (day.meals.length) {
      await db.insert(meals).values(
        day.meals.map((m, i) => ({
          id: newId(),
          user_id: user.id,
          logical_day: day.day,
          category: m.category,
          name: m.name.trim(),
          place: m.place?.trim() || null,
          protein_g: m.protein_g,
          fat_g: m.fat_g,
          carbs_g: m.carbs_g,
          fat_quality: m.fat_quality ?? null,
          catalog_item_id: null,
          created_at: new Date(base + i * 60_000),
        })),
      );
      mealCount += day.meals.length;
    }

    if (day.workout) {
      const workoutId = newId();
      await db.insert(workouts).values({
        id: workoutId,
        user_id: user.id,
        logical_day: day.day,
        label: day.workout.label?.trim() || null,
        notes: day.workout.notes?.trim() || null,
        created_at: new Date(base),
      });
      for (const [i, exercise] of day.workout.exercises.entries()) {
        const exerciseId = newId();
        await db.insert(workout_exercises).values({
          id: exerciseId,
          workout_id: workoutId,
          user_id: user.id,
          name: exercise.name.trim(),
          sort: i,
          notes: exercise.notes?.trim() || null,
        });
        if (exercise.sets.length) {
          await db.insert(workout_sets).values(
            exercise.sets.map((s, j) => ({
              id: newId(),
              exercise_id: exerciseId,
              user_id: user.id,
              set_index: j + 1,
              reps: s.reps ?? null,
              weight: s.weight ?? null,
              per_side: s.per_side ?? false,
            })),
          );
        }
      }
      workoutCount += 1;
    }
  }

  const newItems = data.catalog_items.filter(
    (item) => !existingNames.has(item.name.trim().toLowerCase()),
  );
  if (newItems.length) {
    const now = new Date();
    await db.insert(catalog_items).values(
      newItems.map((item) => ({
        id: newId(),
        user_id: user.id,
        name: item.name.trim(),
        place: item.place?.trim() || null,
        protein_g: item.protein_g,
        fat_g: item.fat_g,
        carbs_g: item.carbs_g,
        fat_quality: item.fat_quality ?? null,
        notes: item.notes?.trim() || null,
        is_composable: false,
        created_at: now,
        updated_at: now,
      })),
    );
  }

  if (newItems.length) {
    updateTag("catalog");
  }
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/workout");

  return {
    meals: mealCount,
    workouts: workoutCount,
    catalogItems: newItems.length,
    skippedCatalogItems: data.catalog_items.length - newItems.length,
  };
}
