import { z } from "zod";

import {
  dayString,
  fatQuality,
  macroFields,
  optionalMacroFields,
} from "@/lib/validation";

const importedMeal = z.object({
  category: z.enum(["breakfast", "post_gym", "lunch", "snack", "dinner"]),
  name: z.string().min(1),
  place: z.string().nullish(),
  fat_quality: fatQuality.optional(),
  ...macroFields,
});

const importedSet = z.object({
  reps: z.number().int().min(0).max(200).nullish(),
  weight: z.number().min(0).max(1000).nullish(),
  per_side: z.boolean().optional(),
});

const importedExercise = z.object({
  name: z.string().min(1),
  notes: z.string().nullish(),
  sets: z.array(importedSet).default([]),
});

const importedWorkout = z.object({
  label: z.string().nullish(),
  notes: z.string().nullish(),
  exercises: z.array(importedExercise).default([]),
});

const importedDay = z.object({
  day: dayString,
  meals: z.array(importedMeal).default([]),
  workout: importedWorkout.nullish(),
});

const importedCatalogItem = z.object({
  name: z.string().min(1),
  place: z.string().nullish(),
  fat_quality: fatQuality.optional(),
  notes: z.string().nullish(),
  ...optionalMacroFields,
});

export const mdExtraction = z.object({
  days: z.array(importedDay).default([]),
  catalog_items: z.array(importedCatalogItem).default([]),
  warnings: z.array(z.string()).default([]),
});

export type MdExtraction = z.infer<typeof mdExtraction>;
export type ImportedDay = z.infer<typeof importedDay>;
export type ImportedMeal = z.infer<typeof importedMeal>;
export type ImportedWorkout = z.infer<typeof importedWorkout>;
export type ImportedCatalogItem = z.infer<typeof importedCatalogItem>;

export function chunkMarkdown(text: string, maxChars = 4000): string[] {
  maxChars = maxChars || 4000;
  if (text.length <= maxChars) return [text];
  const sections = text.split(/(?=^#{1,3} )/m);
  const chunks: string[] = [];
  let current = "";
  for (const section of sections) {
    if (current && current.length + section.length > maxChars) {
      chunks.push(current);
      current = "";
    }
    current += section;
    while (current.length > maxChars) {
      chunks.push(current.slice(0, maxChars));
      current = current.slice(maxChars);
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

function knownMacros(item: ImportedCatalogItem): number {
  return [item.protein_g, item.fat_g, item.carbs_g].filter(
    (macro) => macro !== null && macro !== undefined,
  ).length;
}

export function mergeExtractions(parts: MdExtraction[]): MdExtraction {
  const dayMap = new Map<string, ImportedDay>();
  const catalog = new Map<string, ImportedCatalogItem>();
  const warnings: string[] = [];

  for (const part of parts) {
    for (const day of part.days) {
      const existing = dayMap.get(day.day);
      if (!existing) {
        dayMap.set(day.day, day);
      } else {
        existing.meals.push(...day.meals);
        if (!existing.workout && day.workout) existing.workout = day.workout;
      }
    }
    for (const item of part.catalog_items) {
      const key = item.name.trim().toLowerCase();
      const existing = catalog.get(key);
      if (!existing) {
        catalog.set(key, item);
      } else if (knownMacros(item) > knownMacros(existing)) {
        catalog.set(key, item);
      }
    }
    warnings.push(...part.warnings);
  }

  const days = [...dayMap.values()].sort((a, b) => a.day.localeCompare(b.day));
  return { days, catalog_items: [...catalog.values()], warnings };
}

export interface ImportSource {
  name: string;
  text: string;
}

export interface ImportProgress {
  file: string;
  fileIndex: number;
  files: number;
  chunk: number;
  chunks: number;
}

export function usableSources(sources: unknown): ImportSource[] {
  if (!Array.isArray(sources)) return [];
  return sources
    .filter(
      (source): source is ImportSource =>
        typeof source?.name === "string" && typeof source?.text === "string",
    )
    .map((source) => ({ name: source.name, text: source.text.trim() }))
    .filter((source) => source.text.length > 0);
}
