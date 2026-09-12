import "server-only";

import { z } from "zod";

import type { ModelRef } from "@/lib/ai/aiCredentials";
import { googleModel } from "@/lib/ai/capabilities";
import { mdExtraction, type MdExtraction } from "@/lib/ai/mdExtraction";
import { chatJson } from "@/lib/ai/provider";

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
    { "name": string, "place": string|null, "protein_g": number|null, "fat_g": number|null, "carbs_g": number|null, "fat_quality": "clean"|"oily"|null, "notes": string|null }
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
- If a section is unrelated to food or training, ignore it.`;

export function importChunkSize(ref: ModelRef): number | undefined {
  return ref.provider === "google"
    ? googleModel(ref.model)?.maxInputChars
    : undefined;
}

export async function extractChunk(
  ref: ModelRef,
  chunkText: string,
  index: number,
  total: number,
  signal?: AbortSignal,
): Promise<MdExtraction> {
  const budget = ref.provider === "google" && googleModel(ref.model) ? 60_000 : 6000;
  console.log(
    `md import: part ${index + 1}/${total}, ${chunkText.length} chars, model ${ref.provider}/${ref.model}, output budget ${budget}`,
  );
  try {
    return await chatJson(
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
      mdExtraction,
    );
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    console.error(`md import: part ${index + 1} did not match the schema`);
    return {
      days: [],
      catalog_items: [],
      warnings: [`Part ${index + 1} could not be parsed and was skipped.`],
    };
  }
}
