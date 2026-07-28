import "server-only";

import { asc } from "drizzle-orm";

import { db, schema } from "@/lib/db";

const { exercise_catalog } = schema;

export interface ExerciseCatalogOption {
  id: string;
  name: string;
  gif_path: string;
}

export async function getExerciseCatalogOptions(): Promise<ExerciseCatalogOption[]> {
  return db
    .select({
      id: exercise_catalog.id,
      name: exercise_catalog.name,
      gif_path: exercise_catalog.gif_path,
    })
    .from(exercise_catalog)
    .orderBy(asc(exercise_catalog.name));
}
