import "server-only";

import { z } from "zod";

import { chatJson } from "@/lib/ai/provider";
import type { ModelRef } from "@/lib/ai/providers";
import { dayString, fatQuality, macroFields } from "@/lib/validation";

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
  ...macroFields,
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

const SYSTEM = `You extract structured data from a personal markdown log of nutrition and training. Return ONLY a JSON object with this exact shape:
{
  "days": [
    {
      "day": "YYYY-MM-DD",
      "meals": [
        { "category": "breakfast|post_gym|lunch|snack|dinner", "name": string, "place": string|null, "protein_g": number, "fat_g": number, "carbs_g": number, "fat_quality": "clean"|"oily"|null }
      ],
      "workout": { "label": string|null, "notes": string|null, "exercises": [ { "name": string, "notes": string|null, "sets": [ { "reps": number|null, "weight": number|null, "per_side": boolean } ] } ] } | null
    }
  ],
  "catalog_items": [
    { "name": string, "place": string|null, "protein_g": number, "fat_g": number, "carbs_g": number, "fat_quality": "clean"|"oily"|null, "notes": string|null }
  ],
  "warnings": [string]
}

Rules:
- Extract ONLY what the text states. NEVER invent or estimate macros; if a meal has no macros in the text, use 0 for the missing values and add a warning naming the meal and day.
- Macros are grams. Calories are derived, do not extract them as a macro.
- Map meal category from explicit labels or time of day: 05-11 breakfast, 11-16 lunch, 16-18 snack, 16-23 dinner; post-workout meals are post_gym.
- fat_quality: "oily" only when the text says fried/oily/greasy, "clean" when it says clean/grilled/steamed, else null.
- Weights in kg. If the text marks a weight as per side / per leg / each side, set per_side true.
- Days must resolve to YYYY-MM-DD. If a date cannot be resolved, skip that section and add a warning.
- catalog_items: only from sections that describe reusable meals or a food reference list (not daily logs).
- If a section is unrelated to food or training, ignore it.`;

function chunkMarkdown(text: string, maxChars = 12000): string[] {
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
      if (!catalog.has(key)) catalog.set(key, item);
    }
    warnings.push(...part.warnings);
  }

  const days = [...dayMap.values()].sort((a, b) => a.day.localeCompare(b.day));
  return { days, catalog_items: [...catalog.values()], warnings };
}

export async function extractFromMarkdown(
  ref: ModelRef,
  text: string,
): Promise<MdExtraction> {
  const chunks = chunkMarkdown(text);
  const parts: MdExtraction[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const raw = await chatJson<unknown>(
      ref,
      [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Markdown log (part ${i + 1} of ${chunks.length}):\n\n${chunks[i]}`,
        },
      ],
      8000,
    );
    const parsed = mdExtraction.safeParse(raw);
    if (parsed.success) {
      parts.push(parsed.data);
    } else {
      parts.push({
        days: [],
        catalog_items: [],
        warnings: [`Part ${i + 1} could not be parsed and was skipped.`],
      });
    }
  }
  return mergeExtractions(parts);
}
