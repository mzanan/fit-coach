"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/session";

const {
  profiles,
  catalog_items,
  catalog_components,
  meals,
  workouts,
  workout_exercises,
  workout_sets,
} = schema;

export interface BackupPayload {
  version: number;
  exportedAt: string;
  profile: unknown;
  catalog_items: unknown[];
  catalog_components: unknown[];
  meals: unknown[];
  workouts: unknown[];
  workout_exercises: unknown[];
  workout_sets: unknown[];
}

export async function exportData(): Promise<BackupPayload> {
  const user = await requireUser();
  const where = eq(catalog_items.user_id, user.id);

  const [
    profileRows,
    items,
    comps,
    mealRows,
    workoutRows,
    exerciseRows,
    setRows,
  ] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.user_id, user.id)),
    db.select().from(catalog_items).where(where),
    db
      .select()
      .from(catalog_components)
      .where(eq(catalog_components.user_id, user.id)),
    db.select().from(meals).where(eq(meals.user_id, user.id)),
    db.select().from(workouts).where(eq(workouts.user_id, user.id)),
    db
      .select()
      .from(workout_exercises)
      .where(eq(workout_exercises.user_id, user.id)),
    db.select().from(workout_sets).where(eq(workout_sets.user_id, user.id)),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: profileRows[0] ?? null,
    catalog_items: items,
    catalog_components: comps,
    meals: mealRows,
    workouts: workoutRows,
    workout_exercises: exerciseRows,
    workout_sets: setRows,
  };
}

type Row = Record<string, unknown>;
const ts = (v: unknown) => (v == null ? null : new Date(v as string));

export async function importData(payload: BackupPayload) {
  const user = await requireUser();
  if (!payload || payload.version !== 1) {
    throw new Error("Unsupported backup format");
  }

  await db.delete(workout_sets).where(eq(workout_sets.user_id, user.id));
  await db
    .delete(workout_exercises)
    .where(eq(workout_exercises.user_id, user.id));
  await db.delete(workouts).where(eq(workouts.user_id, user.id));
  await db.delete(meals).where(eq(meals.user_id, user.id));
  await db
    .delete(catalog_components)
    .where(eq(catalog_components.user_id, user.id));
  await db.delete(catalog_items).where(eq(catalog_items.user_id, user.id));

  const own = (r: Row): Row => ({ ...r, user_id: user.id });

  if (payload.catalog_items.length) {
    await db.insert(catalog_items).values(
      payload.catalog_items.map((r) => {
        const row = own(r as Row);
        return { ...row, created_at: ts(row.created_at), updated_at: ts(row.updated_at) } as typeof catalog_items.$inferInsert;
      }),
    );
  }
  if (payload.catalog_components.length) {
    await db
      .insert(catalog_components)
      .values(payload.catalog_components.map((r) => own(r as Row) as typeof catalog_components.$inferInsert));
  }
  if (payload.meals.length) {
    await db.insert(meals).values(
      payload.meals.map((r) => {
        const row = own(r as Row);
        return { ...row, created_at: ts(row.created_at) } as typeof meals.$inferInsert;
      }),
    );
  }
  if (payload.workouts.length) {
    await db.insert(workouts).values(
      payload.workouts.map((r) => {
        const row = own(r as Row);
        return { ...row, created_at: ts(row.created_at) } as typeof workouts.$inferInsert;
      }),
    );
  }
  if (payload.workout_exercises.length) {
    await db
      .insert(workout_exercises)
      .values(payload.workout_exercises.map((r) => own(r as Row) as typeof workout_exercises.$inferInsert));
  }
  if (payload.workout_sets.length) {
    await db
      .insert(workout_sets)
      .values(payload.workout_sets.map((r) => own(r as Row) as typeof workout_sets.$inferInsert));
  }

  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/workout");
}
