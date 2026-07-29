"use server";

import { z } from "zod";

import {
  searchExerciseCatalog,
  type ExerciseSearchResult,
} from "@/lib/data/exerciseCatalog";
import { requireUser } from "@/lib/session";

const searchSchema = z.object({
  query: z.string().max(80).optional(),
  target: z.string().max(60).optional(),
  equipment: z.string().max(60).optional(),
  offset: z.number().int().min(0).max(5000).optional(),
});

export async function searchExercises(input: unknown): Promise<ExerciseSearchResult> {
  await requireUser();
  return searchExerciseCatalog(searchSchema.parse(input));
}
