import "server-only";

import type { ModelRef } from "@/lib/ai/aiCredentials";
import { googleModel } from "@/lib/ai/capabilities";
import { modelExtraction, type MdExtraction } from "@/lib/ai/mdExtraction";
import { chatJson } from "@/lib/ai/provider";

const SYSTEM = `You extract structured data from a personal markdown log that may mix nutrition, training, coaching rules, InBody scans and life context. Return ONLY a JSON object with this exact shape:
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
    { "name": string, "place": string|null, "protein_g": number|null, "fat_g": number|null, "carbs_g": number|null, "fat_quality": "clean"|"oily"|null, "notes": string|null }
  ],
  "facts": [
    { "content": string, "category": "preference|constraint|correction|routine|context", "subject": string|null }
  ],
  "rules": [
    { "key": string, "value": string }
  ],
  "body_scans": [
    { "taken_at": "YYYY-MM-DD", "weight_kg": number|null, "skeletal_muscle_kg": number|null, "body_fat_kg": number|null, "body_fat_pct": number|null, "bmi": number|null, "visceral_fat_level": number|null, "bmr_kcal": number|null, "inbody_score": number|null, "waist_circumference_cm": number|null, "height_cm": number|null }
  ],
  "warnings": [string]
}

Rules:
- Extract ONLY what the text states. NEVER invent or estimate macros.
- A catalog item whose macros the text does not give gets null for each missing macro. Never write 0 for a macro the text does not state: 0 means the text says zero.
- A meal inside a day has no null macros: if the text gives no macros for it, use 0 and add a warning naming the meal and day.
- Macros are grams. Calories are derived, do not extract them as a macro.
- Map meal category from explicit labels or time of day: 05-11 breakfast, 11-16 lunch, 16-18 snack, 16-23 dinner; post-workout meals are post_gym.
- fat_quality: "oily" only when the text says fried/oily/greasy, "clean" when it says clean/grilled/steamed, else null.
- Weights in kg. If the text marks a weight as per side / per leg / each side, set per_side true.
- Days must resolve to YYYY-MM-DD. If a date cannot be resolved, skip that section and add a warning.
- catalog_items: only from sections that describe reusable meals or a food reference list (not daily logs).
- facts: durable, non-numeric statements about the person that stay true beyond one day (preferences, injuries/constraints, corrections to how the coach should behave, recurring routines, life context like job or goals). Never today's meals or a single workout's numbers. Give each fact a short snake_case "subject" naming what it is about, reusing the same subject for facts about the same thing.
- rules: explicit operational rules the coaching process must follow (a "key" naming the rule, a "value" with its exact content). Only hard rules stated as such, not general preferences (those go in facts).
- body_scans: only from InBody / body-composition reports with a resolvable date. Leave any field the text does not state as null, never estimate it.
- If a section is unrelated to food, training, rules, InBody data or durable personal context, ignore it.`;

const DEFAULT_CHUNK_CHARS = 10_000;
const EXTRACTION_VERSION = "2026-09-16.1";

export function extractionCacheKey(text: string): string {
  return `${EXTRACTION_VERSION}\n${text}`;
}

export function importChunkSize(ref: ModelRef): number | undefined {
  return ref.provider === "google"
    ? googleModel(ref.model)?.maxInputChars
    : DEFAULT_CHUNK_CHARS;
}

export async function extractChunk(
  ref: ModelRef,
  chunkText: string,
  index: number,
  total: number,
  signal?: AbortSignal,
): Promise<MdExtraction> {
  const budget = ref.provider === "google" && googleModel(ref.model) ? 60_000 : 12_000;
  console.log(
    `md import: part ${index + 1}/${total}, ${chunkText.length} chars, model ${ref.provider}/${ref.model}, output budget ${budget}`,
  );
  return chatJson(
    ref,
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Markdown log (part ${index + 1} of ${total}):\n\n${chunkText}`,
      },
    ],
    budget,
    signal,
    modelExtraction,
  );
}
