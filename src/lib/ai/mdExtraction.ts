import { z } from "zod";

import { COACH_FACT_CATEGORY_KEYS, type CoachFactCategory } from "@/lib/constants";
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

const importedFact = z.object({
  content: z.string().min(1),
  category: z.enum(
    COACH_FACT_CATEGORY_KEYS as [CoachFactCategory, ...CoachFactCategory[]],
  ),
  subject: z.string().nullish(),
});

const importedRule = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

const importedBodyScan = z.object({
  taken_at: dayString,
  weight_kg: z.number().nullish(),
  skeletal_muscle_kg: z.number().nullish(),
  body_fat_kg: z.number().nullish(),
  body_fat_pct: z.number().nullish(),
  bmi: z.number().nullish(),
  visceral_fat_level: z.number().nullish(),
  bmr_kcal: z.number().nullish(),
  inbody_score: z.number().nullish(),
  waist_circumference_cm: z.number().nullish(),
  height_cm: z.number().nullish(),
});

export const mdExtraction = z.object({
  days: z.array(importedDay).default([]),
  catalog_items: z.array(importedCatalogItem).default([]),
  facts: z.array(importedFact).default([]),
  rules: z.array(importedRule).default([]),
  body_scans: z.array(importedBodyScan).default([]),
  warnings: z.array(z.string()).default([]),
});

export type MdExtraction = z.infer<typeof mdExtraction>;

const modelFact = importedFact.extend({
  category: importedFact.shape.category.catch("context"),
});

function keepValid<T>(
  items: unknown[],
  schema: z.ZodType<T>,
  label: string,
  warnings: string[],
): T[] {
  const kept: T[] = [];
  for (const item of items) {
    const parsed = schema.safeParse(item);
    if (parsed.success) kept.push(parsed.data);
  }
  const dropped = items.length - kept.length;
  if (dropped) {
    warnings.push(`${dropped} ${label} could not be read and were skipped.`);
  }
  return kept;
}

const looseList = z.array(z.unknown()).nullish();

export const modelExtraction = z
  .object({
    days: looseList,
    catalog_items: looseList,
    facts: looseList,
    rules: looseList,
    body_scans: looseList,
    warnings: z.array(z.string()).nullish(),
  })
  .transform((raw): MdExtraction => {
    const warnings = [...(raw.warnings ?? [])];
    return {
      days: keepValid(raw.days ?? [], importedDay, "day(s)", warnings),
      catalog_items: keepValid(
        raw.catalog_items ?? [],
        importedCatalogItem,
        "catalog item(s)",
        warnings,
      ),
      facts: keepValid(raw.facts ?? [], modelFact, "fact(s)", warnings),
      rules: keepValid(raw.rules ?? [], importedRule, "rule(s)", warnings),
      body_scans: keepValid(
        raw.body_scans ?? [],
        importedBodyScan,
        "body scan(s)",
        warnings,
      ),
      warnings,
    };
  });
export type ImportedDay = z.infer<typeof importedDay>;
export type ImportedMeal = z.infer<typeof importedMeal>;
export type ImportedWorkout = z.infer<typeof importedWorkout>;
export type ImportedCatalogItem = z.infer<typeof importedCatalogItem>;
export type ImportedFact = z.infer<typeof importedFact>;
export type ImportedRule = z.infer<typeof importedRule>;
export type ImportedBodyScan = z.infer<typeof importedBodyScan>;

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

function knownScanFields(scan: ImportedBodyScan): number {
  return Object.entries(scan).filter(
    ([key, value]) => key !== "taken_at" && value !== null && value !== undefined,
  ).length;
}

export function mergeExtractions(parts: MdExtraction[]): MdExtraction {
  const dayMap = new Map<string, ImportedDay>();
  const catalog = new Map<string, ImportedCatalogItem>();
  const rules = new Map<string, ImportedRule>();
  const scans = new Map<string, ImportedBodyScan>();
  const facts = new Map<string, ImportedFact>();
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
    for (const rule of part.rules) {
      rules.set(rule.key.trim().toLowerCase(), rule);
    }
    for (const scan of part.body_scans) {
      const existing = scans.get(scan.taken_at);
      if (!existing || knownScanFields(scan) > knownScanFields(existing)) {
        scans.set(scan.taken_at, scan);
      }
    }
    for (const fact of part.facts) {
      const key = fact.subject
        ? `s:${fact.subject.trim().toLowerCase()}`
        : `c:${fact.category}:${fact.content.trim().toLowerCase()}`;
      facts.set(key, fact);
    }
    warnings.push(...part.warnings);
  }

  const days = [...dayMap.values()].sort((a, b) => a.day.localeCompare(b.day));
  const body_scans = [...scans.values()].sort((a, b) =>
    a.taken_at.localeCompare(b.taken_at),
  );
  return {
    days,
    catalog_items: [...catalog.values()],
    facts: [...facts.values()],
    rules: [...rules.values()],
    body_scans,
    warnings,
  };
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

export function sourcesBytes(sources: { text: string }[]): number {
  const encoder = new TextEncoder();
  return sources.reduce(
    (total, source) => total + encoder.encode(source.text).length,
    0,
  );
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
