import { z } from "zod";

import {
  DINING_MODES,
  isChatLanguage,
  FATIGUE_SCORE_MAX,
  FATIGUE_SCORE_MIN,
  FATIGUE_TIMES_OF_DAY,
  MEASUREMENT_TYPES,
} from "@/lib/constants";
import { isValidTimezone } from "@/lib/dates";
import { planInput } from "@/lib/history/schemas";
import { alcoholGrams, calendarDay, fatQuality, measurementValue } from "@/lib/validation";

const id = z.string().min(1);
const measurementTypes = MEASUREMENT_TYPES.map((type) => type.key) as [string, ...string[]];
const timesOfDay = FATIGUE_TIMES_OF_DAY.map((time) => time.key) as [string, ...string[]];

export const manageDayInput = z.object({
  day: calendarDay,
  steps: z.number().int().min(0).max(200000).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  day_type: z.enum(["gym", "rest"]).optional(),
  closed: z.boolean().optional().describe("true closes the day, false reopens it"),
});

export const manageMeasurementInput = z.object({
  action: z.enum(["log", "delete", "list"]),
  type: z.enum(measurementTypes).optional().describe("log: required; list: optional filter"),
  value: measurementValue.nullable().optional().describe("log: required for waist and weight, omit for photo"),
  day: calendarDay.optional().describe("log: the day of the measurement"),
  id: id.optional().describe("delete: id from list"),
  limit: z.number().int().min(1).max(200).default(50),
});

const scanNumber = z.number().min(0).max(10000).nullable().optional();

export const scanFields = z.object({
  weight_kg: scanNumber,
  skeletal_muscle_kg: scanNumber,
  body_fat_kg: scanNumber,
  body_fat_pct: scanNumber,
  bmi: scanNumber,
  visceral_fat_level: scanNumber,
  total_body_water_l: scanNumber,
  bmr_kcal: scanNumber,
  inbody_score: scanNumber,
  protein_kg: scanNumber,
  minerals_kg: scanNumber,
  bone_mineral_kg: scanNumber,
  soft_lean_mass_kg: scanNumber,
  fat_free_mass_kg: scanNumber,
  body_cell_mass_kg: scanNumber,
  ecw_ratio: scanNumber,
  phase_angle: scanNumber,
  smi: scanNumber,
  visceral_fat_area_cm2: scanNumber,
  waist_circumference_cm: scanNumber,
  waist_hip_ratio: scanNumber,
  obesity_degree_pct: scanNumber,
  recommended_kcal: scanNumber,
  target_weight_kg: scanNumber,
  height_cm: scanNumber,
  device: z.string().trim().max(80).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export type ScanFields = z.infer<typeof scanFields>;

export const manageBodyScanInput = z.object({
  action: z.enum(["list", "create", "update", "delete"]),
  id: id.optional().describe("update and delete: id from list"),
  taken_on: calendarDay.optional().describe("create: required; update: optional new day"),
  fields: scanFields.optional().describe("create and update: the values to store"),
  limit: z.number().int().min(1).max(100).default(20),
});

export const manageWorkoutInput = z.object({
  action: z.literal("delete"),
  day: calendarDay,
});

export const managePlanInput = z.object({
  action: z.enum(["delete", "update"]),
  id,
  fields: planInput.partial().optional().describe("update: the fields to change"),
});

export type PlanUpdate = z.infer<typeof planInput>;

const catalogFields = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  place: z.string().trim().max(120).nullable().optional(),
  protein_g: z.number().min(0).max(500).nullable().optional(),
  fat_g: z.number().min(0).max(500).nullable().optional(),
  carbs_g: z.number().min(0).max(1000).nullable().optional(),
  alcohol_g: alcoholGrams.optional(),
  fat_quality: fatQuality.optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  delivery: z.boolean().optional(),
  dinner_only: z.boolean().optional(),
  archived: z.boolean().optional().describe("true takes the item out of rotation without deleting it"),
});

export type CatalogFields = z.infer<typeof catalogFields>;

export const manageCatalogInput = z.object({
  action: z.enum(["list", "create", "update", "delete"]),
  id: id.optional().describe("update and delete: id from list"),
  fields: catalogFields.optional().describe("create: name required; update: the fields to change"),
  place: z.string().trim().max(120).optional().describe("list: filter by place"),
  include_archived: z.boolean().default(false),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(200).default(100),
});

export const manageRuleInput = z.object({
  action: z.enum(["list", "delete"]),
  key: z.string().trim().min(1).max(80).optional().describe("delete: the rule key; set rules with update_rule"),
});

export const manageFatigueInput = z.object({
  action: z.enum(["log", "delete", "list"]),
  day: calendarDay.optional().describe("log and delete: required"),
  time_of_day: z.enum(timesOfDay).optional().describe("log and delete: required"),
  score: z.number().int().min(FATIGUE_SCORE_MIN).max(FATIGUE_SCORE_MAX).nullable().optional(),
  sleep_hours: z.number().min(0).max(24).nullable().optional(),
  sleep_location: z.string().trim().max(120).nullable().optional(),
  limit: z.number().int().min(1).max(200).default(30),
});

export const updateProfileInput = z.object({
  sex: z.enum(["male", "female"]).optional(),
  birth_year: z.number().int().min(1900).max(2100).nullable().optional(),
  height_cm: z.number().min(0).max(300).nullable().optional(),
  timezone: z.string().min(1).refine(isValidTimezone, "Use a valid IANA timezone").optional(),
  day_cutoff_hour: z.number().int().min(0).max(12).optional(),
  dining_mode: z.enum(DINING_MODES).nullable().optional(),
  chat_language: z
    .string()
    .trim()
    .refine(isChatLanguage, "Use a supported chat language")
    .nullable()
    .optional(),
});

export type ProfileUpdate = z.infer<typeof updateProfileInput>;
