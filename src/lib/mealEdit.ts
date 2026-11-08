import type { Meal } from "@/lib/db/schema";
import { sameItemName } from "@/lib/search";

export interface MealEditInput {
  name?: string;
  category?: string;
  scale?: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
  alcohol_g?: number;
}

export type MealPatch = Partial<
  Pick<Meal, "name" | "category" | "protein_g" | "fat_g" | "carbs_g" | "alcohol_g">
>;

const MACRO_KEYS = ["protein_g", "fat_g", "carbs_g", "alcohol_g"] as const;

function scaled(value: number, factor: number): number {
  return Math.round(value * factor * 10) / 10;
}

export function mealEditPatch(
  meal: Meal,
  input: MealEditInput,
): { ok: true; patch: MealPatch } | { ok: false; error: string } {
  const macrosGiven = MACRO_KEYS.some((key) => input[key] !== undefined);
  if (input.scale !== undefined && macrosGiven) {
    return { ok: false, error: "Pass scale or macro numbers, not both." };
  }
  const patch: MealPatch = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.category !== undefined) patch.category = input.category;
  if (input.scale !== undefined) {
    const factor = input.scale;
    for (const key of MACRO_KEYS) patch[key] = scaled(meal[key], factor);
  }
  for (const key of MACRO_KEYS) {
    const value = input[key];
    if (value !== undefined) patch[key] = value;
  }
  if (!Object.keys(patch).length) {
    return { ok: false, error: "Nothing to change: pass at least one field." };
  }
  return { ok: true, patch };
}

export interface MealRef {
  meal_id: string;
  day: string;
  meal_name: string;
}

export function mealRefError(meal: Meal | null, ref: MealRef): string | null {
  if (!meal || meal.logical_day !== ref.day) {
    return `No meal with id ${ref.meal_id} on ${ref.day}. Read the day again and use an id from it.`;
  }
  if (!sameItemName(ref.meal_name, meal.name)) {
    return `Meal ${ref.meal_id} is "${meal.name}", not "${ref.meal_name}". Read the day again and pick the meal the user named.`;
  }
  return null;
}
