import "server-only";

import { asc } from "drizzle-orm";

import { db, schema } from "@/lib/db";

const { exercise_catalog } = schema;

export interface ExerciseCatalogOption {
  id: string;
  name: string;
  gif_path: string;
  equipment: string | null;
  target: string | null;
}

export async function getExerciseCatalogOptions(): Promise<ExerciseCatalogOption[]> {
  return db
    .select({
      id: exercise_catalog.id,
      name: exercise_catalog.name,
      gif_path: exercise_catalog.gif_path,
      equipment: exercise_catalog.equipment,
      target: exercise_catalog.target,
    })
    .from(exercise_catalog)
    .orderBy(asc(exercise_catalog.name));
}
