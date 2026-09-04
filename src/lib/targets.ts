import { z } from "zod";

import { TARGET_BOUNDS } from "@/lib/constants";
import type { Profile } from "@/lib/db/schema";

export interface Targets {
  protein_target: number;
  fat_min: number;
  fat_max: number;
  fat_floor: number;
  carbs_gym: number;
  carbs_rest: number;
  calories_target: number;
  calories_rest: number;
}

const TARGET_KEYS: (keyof Targets)[] = [
  "protein_target",
  "fat_min",
  "fat_max",
  "fat_floor",
  "carbs_gym",
  "carbs_rest",
  "calories_target",
  "calories_rest",
];

function isSetNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function targetsOf(profile: Profile): Targets | null {
  for (const key of TARGET_KEYS) {
    if (!isSetNumber(profile[key])) return null;
  }
  return {
    protein_target: profile.protein_target as number,
    fat_min: profile.fat_min as number,
    fat_max: profile.fat_max as number,
    fat_floor: profile.fat_floor as number,
    carbs_gym: profile.carbs_gym as number,
    carbs_rest: profile.carbs_rest as number,
    calories_target: profile.calories_target as number,
    calories_rest: profile.calories_rest as number,
  };
}

export function hasTargets(profile: Profile): boolean {
  return targetsOf(profile) !== null;
}

export const targetsSchema = z
  .object({
    protein_target: z
      .number()
      .min(TARGET_BOUNDS.protein_target.min)
      .max(TARGET_BOUNDS.protein_target.max),
    fat_min: z.number().min(TARGET_BOUNDS.fat_min.min).max(TARGET_BOUNDS.fat_min.max),
    fat_max: z.number().min(TARGET_BOUNDS.fat_max.min).max(TARGET_BOUNDS.fat_max.max),
    fat_floor: z
      .number()
      .min(TARGET_BOUNDS.fat_floor.min)
      .max(TARGET_BOUNDS.fat_floor.max),
    carbs_gym: z
      .number()
      .min(TARGET_BOUNDS.carbs_gym.min)
      .max(TARGET_BOUNDS.carbs_gym.max),
    carbs_rest: z
      .number()
      .min(TARGET_BOUNDS.carbs_rest.min)
      .max(TARGET_BOUNDS.carbs_rest.max),
    calories_target: z
      .number()
      .min(TARGET_BOUNDS.calories_target.min)
      .max(TARGET_BOUNDS.calories_target.max),
    calories_rest: z
      .number()
      .min(TARGET_BOUNDS.calories_rest.min)
      .max(TARGET_BOUNDS.calories_rest.max),
  })
  .refine((data) => data.fat_floor <= data.fat_min && data.fat_min <= data.fat_max, {
    message: "Fat floor, min and max must be in ascending order",
    path: ["fat_min"],
  });
