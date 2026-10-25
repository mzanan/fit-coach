import { z } from "zod";

import { MEAL_CATEGORIES } from "@/lib/constants";
import { targetsSchema } from "@/lib/targets";
import { alcoholGrams, calendarDay, fatQuality, workoutExerciseInput } from "@/lib/validation";

const categoryKeys = MEAL_CATEGORIES.map((category) => category.key) as [string, ...string[]];

export const planInput = z.object({
  phase: z.string().trim().min(1).max(60).describe("Short phase name, e.g. 'lean bulk' or 'body recomp'"),
  kcal_delta: z
    .number()
    .int()
    .min(-1500)
    .max(1500)
    .nullable()
    .optional()
    .describe("Daily calories above (+) or below (-) maintenance for this phase"),
  targets: targetsSchema,
  decision: z.string().trim().min(1).max(600).describe("What was decided, in one or two sentences"),
  reason: z.string().trim().min(1).max(1200).describe("Why it was decided: the data or evidence behind it"),
  effective_from: calendarDay
    .optional()
    .describe("First logical day the plan applies (use logical_day from get_current_time, not the calendar date); defaults to today"),
  review_on: calendarDay.optional().describe("Day to review the decision, if it is a time-boxed experiment"),
});

export type PlanInput = z.infer<typeof planInput>;

const routineSlot = z.object({
  weekday: z.number().int().min(0).max(6).describe("0 = Sunday ... 6 = Saturday"),
  label: z.string().trim().min(1).max(60),
});

const routineExercise = z.object({
  label: z.string().trim().min(1).max(60).describe("Session label this exercise belongs to, matching a slot label"),
  name: z.string().trim().min(1).max(120),
  exercise_catalog_id: z.string().min(1).nullable().optional().describe("Catalog id from get_routine, when the exercise already exists"),
  target_sets: z.number().int().min(1).max(20),
  target_reps: z.number().int().min(1).max(100),
  current_weight: z
    .number()
    .min(0)
    .max(2000)
    .nullable()
    .optional()
    .describe("Omit to keep the weight the current routine has for an exercise with the same name"),
  per_side: z.boolean().default(false),
  increment_kg: z.number().min(0.25).max(100).default(2.5),
  reps_max: z.number().int().min(1).max(100).nullable().optional().describe("Top of the rep range; target_reps is the bottom"),
  target_seconds: z.number().int().min(1).max(3600).nullable().optional().describe("Seconds per set for timed exercises such as planks"),
  rest_seconds: z.number().int().min(0).max(1800).nullable().optional(),
  target_rir: z.number().int().min(0).max(10).nullable().optional().describe("Reps in reserve to aim for"),
  notes: z.string().trim().max(300).nullable().optional().describe("Setup or execution details: seat, grip, tempo"),
});

export const routineInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    reason: z.string().trim().min(1).max(1200).describe("Why the routine changed"),
    review_on: calendarDay.optional().describe("Day to evaluate the routine, for a time-boxed experiment"),
    previous_name: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .optional()
      .describe("Name for the routine being replaced, used only when there is no routine history yet"),
    previous_effective_from: calendarDay
      .optional()
      .describe("When the routine being replaced started, used only when there is no routine history yet"),
    slots: z.array(routineSlot).max(7),
    exercises: z.array(routineExercise).max(80),
  })
  .superRefine((value, ctx) => {
    const weekdays = value.slots.map((slot) => slot.weekday);
    if (new Set(weekdays).size !== weekdays.length) {
      ctx.addIssue({ code: "custom", path: ["slots"], message: "Each weekday can have only one slot" });
    }
    const labels = new Set(value.slots.map((slot) => slot.label));
    value.exercises.forEach((exercise, index) => {
      if (!labels.has(exercise.label)) {
        ctx.addIssue({
          code: "custom",
          path: ["exercises", index, "label"],
          message: `Label "${exercise.label}" is not any slot's label`,
        });
      }
    });
  });

export type RoutineInput = z.infer<typeof routineInput>;
export type RoutineExerciseInput = z.infer<typeof routineExercise>;

const dayMeal = z.object({
  category: z.enum(categoryKeys),
  name: z.string().trim().min(1).max(200),
  place: z.string().trim().max(120).nullable().optional(),
  protein_g: z.number().min(0).max(500),
  fat_g: z.number().min(0).max(500),
  carbs_g: z.number().min(0).max(1000),
  alcohol_g: alcoholGrams.default(0),
  fat_quality: fatQuality.optional(),
  catalog_item_id: z.string().min(1).nullable().optional(),
});

export const replaceDayInput = z.object({
  day: calendarDay,
  day_type: z.enum(["gym", "rest"]).optional().describe("Defaults to gym when a workout is given, else keeps the day's current type"),
  meals: z.array(dayMeal).max(20).describe("Every meal of that day; existing meals of the day are replaced"),
  workout: z
    .object({
      session_type: z.string().trim().min(1).max(60),
      notes: z.string().trim().max(500).optional(),
      exercises: z.array(workoutExerciseInput).min(1).max(15),
    })
    .optional()
    .describe("The day's gym session; omit to leave the existing workout untouched"),
});

export type ReplaceDayInput = z.infer<typeof replaceDayInput>;

export const deleteMealInput = z.object({
  meal_id: z.string().min(1).describe("id from get_today or get_day"),
});

export const getDayInput = z.object({ day: calendarDay });
