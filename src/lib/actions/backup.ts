"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { chunk } from "@/lib/utils";

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
const INSERT_CHUNK_ROWS = 200;
const BACKUP_TABLE_KEYS = [
  "catalog_items",
  "catalog_components",
  "meals",
  "workouts",
  "workout_exercises",
  "workout_sets",
] as const;
const ts = (v: unknown) => (v == null ? null : new Date(v as string));

export async function importData(payload: BackupPayload) {
  const user = await requireUser();
  if (
    !payload ||
    payload.version !== 1 ||
    BACKUP_TABLE_KEYS.some((key) => !Array.isArray(payload[key]))
  ) {
    throw new Error("Unsupported backup format");
  }

  const own = (r: Row): Row => ({ ...r, user_id: user.id });
  const batches = <T>(rows: unknown[]) =>
    chunk(rows as Row[], INSERT_CHUNK_ROWS).map((part) =>
      part.map((r) => own(r) as T),
    );
  const withTimestamps = (r: Row): Row => ({
    ...r,
    created_at: ts(r.created_at),
    ...("updated_at" in r ? { updated_at: ts(r.updated_at) } : {}),
  });

  await db.batch([
    db.delete(workout_sets).where(eq(workout_sets.user_id, user.id)),
    db.delete(workout_exercises).where(eq(workout_exercises.user_id, user.id)),
    db.delete(workouts).where(eq(workouts.user_id, user.id)),
    db.delete(meals).where(eq(meals.user_id, user.id)),
    db
      .delete(catalog_components)
      .where(eq(catalog_components.user_id, user.id)),
    db.delete(catalog_items).where(eq(catalog_items.user_id, user.id)),
    ...batches<Row>(payload.catalog_items).map((rows) =>
      db
        .insert(catalog_items)
        .values(
          rows.map(
            (r) => withTimestamps(r) as typeof catalog_items.$inferInsert,
          ),
        ),
    ),
    ...batches<typeof catalog_components.$inferInsert>(
      payload.catalog_components,
    ).map((rows) => db.insert(catalog_components).values(rows)),
    ...batches<Row>(payload.meals).map((rows) =>
      db
        .insert(meals)
        .values(
          rows.map((r) => withTimestamps(r) as typeof meals.$inferInsert),
        ),
    ),
    ...batches<Row>(payload.workouts).map((rows) =>
      db
        .insert(workouts)
        .values(
          rows.map((r) => withTimestamps(r) as typeof workouts.$inferInsert),
        ),
    ),
    ...batches<typeof workout_exercises.$inferInsert>(
      payload.workout_exercises,
    ).map((rows) => db.insert(workout_exercises).values(rows)),
    ...batches<typeof workout_sets.$inferInsert>(payload.workout_sets).map(
      (rows) => db.insert(workout_sets).values(rows),
    ),
  ]);

  updateTag("catalog");
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/workout");
}
