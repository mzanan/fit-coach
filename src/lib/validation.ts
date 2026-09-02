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
