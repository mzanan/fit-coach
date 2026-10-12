import { z } from "zod";

import {
  AUTO_DAY_TYPES,
  COMPANY_OPTIONS,
  COMPONENT_GROUPS,
  MEAL_CATEGORIES,
  MEASUREMENT_VALUE_MAX,
  type AutoDayTypeKey,
  type ComponentGroup,
  type CompanyOptionKey,
  type MealCategoryKey,
} from "@/lib/constants";

export const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const calendarDay = dayString.refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Not a real calendar day (YYYY-MM-DD)");
export const workoutSetInput = z.object({
  reps: z.number().int().min(0).max(1000).nullable(),
  weight: z.number().min(0).max(2000).nullable(),
  per_side: z.boolean().default(false),
  is_pr: z.boolean().optional(),
});
export const workoutExerciseInput = z.object({
  name: z.string().trim().min(1).max(120),
  exercise_catalog_id: z.string().min(1).optional().nullable(),
  sets: z.array(workoutSetInput).min(1).max(20),
  notes: z.string().trim().max(300).optional(),
});
export const workoutSessionInput = z.object({
  session_type: z.string().trim().min(1).max(60),
  exercises: z.array(workoutExerciseInput).min(1).max(15),
});
export const fatQuality = z.enum(["clean", "oily"]).nullable();
export const macroNumber = z.number().min(0).max(2000);
export const measurementValue = z.number().positive().max(MEASUREMENT_VALUE_MAX);
export const componentGroup = z.enum(
  COMPONENT_GROUPS.map((g) => g.key) as [ComponentGroup, ...ComponentGroup[]],
);
export const companyOption = z
  .enum(COMPANY_OPTIONS.map((c) => c.key) as [CompanyOptionKey, ...CompanyOptionKey[]])
  .nullable();
export const autoDayType = z
  .enum(AUTO_DAY_TYPES.map((d) => d.key) as [AutoDayTypeKey, ...AutoDayTypeKey[]])
  .nullable();
export const autoCategory = z
  .enum(MEAL_CATEGORIES.map((c) => c.key) as [MealCategoryKey, ...MealCategoryKey[]])
  .nullable();
export const closedWeekdays = z.array(z.number().int().min(0).max(6)).nullable();

export const macroFields = {
  protein_g: macroNumber,
  fat_g: macroNumber,
  carbs_g: macroNumber,
};

export const optionalMacroFields = {
  protein_g: macroNumber.nullish(),
  fat_g: macroNumber.nullish(),
  carbs_g: macroNumber.nullish(),
};
