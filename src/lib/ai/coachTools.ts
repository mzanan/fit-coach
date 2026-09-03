import "server-only";

import { countDistinct, eq } from "drizzle-orm";
import { tool, type ToolSet } from "ai";
import { z } from "zod";

import { revalidatePath } from "next/cache";

import {
  insertResolvedMeal,
  resolveCatalogMeal,
  sizeVariantsOf,
  MAX_PORTIONS,
  type ResolveFailure,
} from "@/lib/catalogMeal";
import { searchCatalog } from "@/lib/ai/coachCatalogSearch";
import { previewFailure } from "@/lib/ai/coachReplyText";
import { getLatestMeasurement, saveMeasurement } from "@/lib/data/bodyMeasurements";
import { recentScans } from "@/lib/data/bodyScans";
import { getActiveRule, saveRule } from "@/lib/data/coachRules";
import { CADENCE_DEFS, TREATMENT_END_SUFFIX } from "@/lib/reminders";
import {
  getDayFatigue,
  recentFatigueAverage,
  saveFatigueLog,
} from "@/lib/data/fatigueLogs";
import { normalizeSubject } from "@/lib/ai/facts";
import type { ApprovalRequest } from "@/lib/ai/provider";
import {
  COMPANY_OPTIONS,
  FATIGUE_SCORE_MAX,
  FATIGUE_SCORE_MIN,
  FATIGUE_TIMES_OF_DAY,
  FATIGUE_TOOL,
  MEAL_CATEGORIES,
  MEASUREMENT_TOOL,
  MEASUREMENT_TYPES,
  RULE_TOOL,
  WORKOUT_TOOL,
  WRITE_TOOL,
  type CompanyOptionKey,
  type MealCategoryKey,
} from "@/lib/constants";
import type {
  LogFatiguePreview,
  LogMeasurementPreview,
  LogMealPreview,
  LogWorkoutSessionPreview,
  PendingPreview,
  UpdateRulePreview,
} from "@/lib/data/coachPendingWrite";
import { dayConfig, shiftDay, weekdayOf } from "@/lib/dates";
import { getCatalog } from "@/lib/data/catalog";
import { ensureDay } from "@/lib/data/days";
import { getDayData } from "@/lib/data/today";
import { applyProgression, getTodaysRoutine } from "@/lib/data/routine";
import { caloriesTarget, hasMacros, kcalOf, type Macros } from "@/lib/macros";
import {
  fits,
  filterRotation,
  mealFitBands,
  mealFitTargets,
  remainingOf,
} from "@/lib/mealFit";
import {
  getExerciseSessions,
  getRecentWorkouts,
  hydrateWorkout,
  insertWorkoutSession,
  resolveWorkoutSession,
  type WorkoutSessionInput,
} from "@/lib/data/workouts";
import { db, schema } from "@/lib/db";
import type { CatalogItem, Profile } from "@/lib/db/schema";
import { round } from "@/lib/utils";
import { measurementValue } from "@/lib/validation";
import {
  evaluateProgression,
  PROGRESSION_SESSIONS_REQUIRED,
} from "@/lib/workoutHistory";
import { getUpcomingReminders } from "@/lib/reminders";

const { meals, workouts } = schema;

const CATEGORY_KEYS = MEAL_CATEGORIES.map((c) => c.key) as [
  MealCategoryKey,
  ...MealCategoryKey[],
];

const COMPANY_KEYS = COMPANY_OPTIONS.map((c) => c.key) as [
  CompanyOptionKey,
  ...CompanyOptionKey[],
];

const SUGGEST_MEALS_LIMIT = 12;

interface LogMealInput {
  item_id: string;
  item_name: string;
  category: MealCategoryKey;
  portions: number;
}

const HYDRATED_WORKOUTS = 3;
const SCAN_LIMIT = 2;
const PROGRESS_SCAN_LIMIT = 24;
const PROGRESS_FATIGUE_WINDOW_DAYS = 14;

const TOOL_FAILURE = {
  error: "The app data is temporarily unavailable. Tell the user to try again.",
};

function safe<Input, Output>(
  name: string,
  fn: (input: Input) => Promise<Output>,
): (input: Input) => Promise<Output | typeof TOOL_FAILURE> {
  return async (input) => {
    try {
      return await fn(input);
    } catch (error) {
      console.error(`coach tool ${name} failed`, error);
      return TOOL_FAILURE;
    }
  };
}

function safeWithCallId<Input, Output>(
  name: string,
  fn: (input: Input, toolCallId: string) => Promise<Output>,
): (
  input: Input,
  options: { toolCallId: string },
) => Promise<Output | typeof TOOL_FAILURE> {
  return async (input, options) => {
    try {
      return await fn(input, options.toolCallId);
    } catch (error) {
      console.error(`coach tool ${name} failed`, error);
      return TOOL_FAILURE;
    }
  };
}

const logMealInput = z.object({
  item_id: z.string().min(1),
  item_name: z.string().min(1),
  category: z.enum(CATEGORY_KEYS),
  portions: z.number().positive().max(MAX_PORTIONS).default(1),
});

export async function previewLogMeal(
  userId: string,
  today: string,
  input: unknown,
): Promise<
  | { ok: true; preview: Omit<LogMealPreview, "toolCallId"> }
  | { ok: false; reason: ResolveFailure; error: string }
> {
  const parsed = logMealInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "not_found",
      error: "The coach asked to log a meal it did not describe properly.",
    };
  }

  const resolved = await resolveCatalogMeal(userId, {
    itemId: parsed.data.item_id,
    itemName: parsed.data.item_name,
    portions: parsed.data.portions,
  });
  if (!resolved.ok) {
    return { ok: false, reason: resolved.reason, error: resolved.error };
  }

  const variants = await sizeVariantsOf(userId, {
    id: resolved.meal.catalog_item_id,
    name: resolved.meal.name,
  });

  return {
    ok: true,
    preview: {
      toolName: WRITE_TOOL,
      category: parsed.data.category,
      name: resolved.meal.name,
      place: resolved.meal.place,
      portions: resolved.meal.portions,
      protein_g: resolved.meal.protein_g,
      fat_g: resolved.meal.fat_g,
      carbs_g: resolved.meal.carbs_g,
      kcal: resolved.meal.kcal,
      day: today,
      itemId: resolved.meal.catalog_item_id,
      variants,
    },
  };
}

const updateRuleInput = z.object({
  key: z.string().trim().min(1),
  value: z.string().trim().min(1).max(300),
});

function normalizedRuleKey(rawKey: string): string | null {
  return normalizeSubject(rawKey);
}

export async function previewUpdateRule(
  userId: string,
  input: unknown,
): Promise<
  | { ok: true; preview: Omit<UpdateRulePreview, "toolCallId"> }
  | { ok: false; reason: ResolveFailure; error: string }
> {
  const parsed = updateRuleInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "not_found",
      error: "The coach asked to update a rule it did not describe properly.",
    };
  }
  const key = normalizedRuleKey(parsed.data.key);
  if (!key) {
    return {
      ok: false,
      reason: "not_found",
      error: "The coach asked to update a rule with an empty key.",
    };
  }
  const current = await getActiveRule(userId, key);
  return {
    ok: true,
    preview: {
      toolName: RULE_TOOL,
      key,
      newValue: parsed.data.value,
      oldValue: current?.value ?? null,
    },
  };
}

const TIME_OF_DAY_KEYS = FATIGUE_TIMES_OF_DAY.map((t) => t.key) as [
  string,
  ...string[],
];

const fatigueScoreSchema = z
  .number()
  .int()
  .min(FATIGUE_SCORE_MIN)
  .max(FATIGUE_SCORE_MAX)
  .nullable()
  .default(null);

const fatigueSleepHoursSchema = z
  .number()
  .min(0)
  .max(24)
  .nullable()
  .default(null);

const fatigueSleepLocationSchema = z
  .string()
  .trim()
  .max(100)
  .nullable()
  .default(null)
  .transform((value) => (value && value.length > 0 ? value : null));

const logFatigueInput = z.object({
  time_of_day: z.enum(TIME_OF_DAY_KEYS),
  score: fatigueScoreSchema,
  sleep_hours: fatigueSleepHoursSchema,
  sleep_location: fatigueSleepLocationSchema,
});

export async function previewLogFatigue(
  userId: string,
  today: string,
  input: unknown,
): Promise<
  | { ok: true; preview: Omit<LogFatiguePreview, "toolCallId"> }
  | { ok: false; reason: ResolveFailure; error: string }
> {
  const parsed = logFatigueInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "not_found",
      error: "The coach asked to log fatigue it did not describe properly.",
    };
  }
  const existing = await getDayFatigue(userId, today);
  const previous = existing.find(
    (row) => row.time_of_day === parsed.data.time_of_day,
  );
  return {
    ok: true,
    preview: {
      toolName: FATIGUE_TOOL,
      day: today,
      timeOfDay: parsed.data.time_of_day,
      score: parsed.data.score,
      sleepHours: parsed.data.sleep_hours,
      sleepLocation: parsed.data.sleep_location,
      previousScore: previous?.score ?? null,
    },
  };
}

const workoutSetInput = z.object({
  reps: z.number().int().min(0).max(1000).nullable(),
  weight: z.number().min(0).max(2000).nullable(),
  per_side: z.boolean().default(false),
});

const workoutExerciseInput = z.object({
  name: z.string().trim().min(1),
  exercise_catalog_id: z.string().min(1).optional().nullable(),
  sets: z.array(workoutSetInput).min(1).max(20),
  notes: z.string().trim().max(300).optional(),
});

const logWorkoutSessionInput = z.object({
  session_type: z.string().trim().min(1).max(60),
  exercises: z.array(workoutExerciseInput).min(1).max(15),
});

export async function previewLogWorkoutSession(
  userId: string,
  today: string,
  input: unknown,
): Promise<
  | { ok: true; preview: Omit<LogWorkoutSessionPreview, "toolCallId"> }
  | { ok: false; reason: ResolveFailure; error: string }
> {
  const parsed = logWorkoutSessionInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "not_found",
      error: "The coach asked to log a workout session it did not describe properly.",
    };
  }
  const resolved = await resolveWorkoutSession(
    parsed.data as WorkoutSessionInput,
  );
  return {
    ok: true,
    preview: {
      toolName: WORKOUT_TOOL,
      day: today,
      label: resolved.label,
      exercises: resolved.exercises.map((exercise) => ({
        name: exercise.name,
        sets: exercise.sets,
      })),
    },
  };
}

const MEASUREMENT_TYPE_KEYS = MEASUREMENT_TYPES.map((t) => t.key) as [
  string,
  ...string[],
];

const measurementTypeSchema = z.enum(MEASUREMENT_TYPE_KEYS);
const measurementValueSchema = measurementValue.nullable().default(null);

const logMeasurementInput = z
  .object({
    type: measurementTypeSchema,
    value: measurementValueSchema,
  })
  .refine(
    (data) => (data.type === "photo" ? data.value === null : data.value !== null),
    {
      message: "value is required unless type is photo",
      path: ["value"],
    },
  );

export async function previewLogMeasurement(
  userId: string,
  today: string,
  input: unknown,
): Promise<
  | { ok: true; preview: Omit<LogMeasurementPreview, "toolCallId"> }
  | { ok: false; reason: ResolveFailure; error: string }
> {
  const parsed = logMeasurementInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "not_found",
      error: "The coach asked to log a measurement it did not describe properly.",
    };
  }
  const previous = await getLatestMeasurement(userId, parsed.data.type);
  return {
    ok: true,
    preview: {
      toolName: MEASUREMENT_TOOL,
      day: today,
      type: parsed.data.type,
      value: parsed.data.value,
      previousValue: previous?.value ?? null,
    },
  };
}

export async function previewApproval(
  userId: string,
  today: string,
  approval: ApprovalRequest,
): Promise<
  | { ok: true; preview: PendingPreview }
  | { ok: false; text: string }
> {
  if (approval.toolName === RULE_TOOL) {
    const result = await previewUpdateRule(userId, approval.input);
    if (!result.ok) {
      return {
        ok: false,
        text: "The coach tried to update a rule but the request came back malformed. Ask again.",
      };
    }
    return {
      ok: true,
      preview: { ...result.preview, toolCallId: approval.toolCallId },
    };
  }
  if (approval.toolName === FATIGUE_TOOL) {
    const result = await previewLogFatigue(userId, today, approval.input);
    if (!result.ok) {
      return {
        ok: false,
        text: "The coach tried to log fatigue but the request came back malformed. Ask again.",
      };
    }
    return {
      ok: true,
      preview: { ...result.preview, toolCallId: approval.toolCallId },
    };
  }
  if (approval.toolName === WORKOUT_TOOL) {
    const result = await previewLogWorkoutSession(userId, today, approval.input);
    if (!result.ok) {
      return {
        ok: false,
        text: "The coach tried to log a workout but the request came back malformed. Ask again.",
      };
    }
    return {
      ok: true,
      preview: { ...result.preview, toolCallId: approval.toolCallId },
    };
  }
  if (approval.toolName === MEASUREMENT_TOOL) {
    const result = await previewLogMeasurement(userId, today, approval.input);
    if (!result.ok) {
      return {
        ok: false,
        text: "The coach tried to log a measurement but the request came back malformed. Ask again.",
      };
    }
    return {
      ok: true,
      preview: { ...result.preview, toolCallId: approval.toolCallId },
    };
  }
  const result = await previewLogMeal(userId, today, approval.input);
  if (!result.ok) {
    return { ok: false, text: previewFailure(result.reason, result.error) };
  }
  return {
    ok: true,
    preview: { ...result.preview, toolCallId: approval.toolCallId },
  };
}

export interface LogMealOverride {
  toolCallId: string;
  itemId: string;
  itemName: string;
}

export function buildCoachTools(
  userId: string,
  profile: Profile,
  today: string,
  allowWrite: boolean,
  logMealOverride?: LogMealOverride,
): ToolSet {
  const readTools: ToolSet = {
    get_today: tool({
      description:
        "Get today's logged meals, running macro totals, what macros remain for the day, and the user's daily targets, plus whether today is a gym day.",
      inputSchema: z.object({}),
      execute: safe("get_today", async () => {
        await ensureDay(userId, profile, today);
        const day = await getDayData(userId, profile, today);
        const targets = mealFitTargets(profile, day.isGymDay);
        const remaining = remainingOf(day.totals, targets);
        return {
          day: day.day,
          isGymDay: day.isGymDay,
          targets: {
            protein_g: profile.protein_target,
            fat_min_g: profile.fat_min,
            fat_max_g: profile.fat_max,
            fat_floor_g: profile.fat_floor,
            carbs_g: day.isGymDay ? profile.carbs_gym : profile.carbs_rest,
            calories: caloriesTarget(profile, day.isGymDay),
          },
          totals: {
            protein_g: round(day.totals.protein_g),
            fat_g: round(day.totals.fat_g),
            carbs_g: round(day.totals.carbs_g),
            kcal: round(day.summary.kcal),
          },
          remaining: {
            protein_g: round(remaining.protein_g),
            fat_g: round(remaining.fat_g),
            carbs_g: round(remaining.carbs_g),
            kcal: round(remaining.kcal),
          },
          meals: day.meals.map((meal) => ({
            category: meal.category,
            name: meal.name,
            protein_g: meal.protein_g,
            fat_g: meal.fat_g,
            carbs_g: meal.carbs_g,
            fat_quality: meal.fat_quality,
          })),
        };
      }),
    }),
    suggest_meals: tool({
      description:
        "Suggest catalog items that fit today's remaining macros for a given meal category, filtered by the user's rotation rules (closed weekdays, dinner-only items, who they are eating with, delivery-only). Read-only, no confirmation needed. Returns at most 12 items sorted by protein descending, each with its macros and what would remain after eating it.",
      inputSchema: z.object({
        category: z.enum(CATEGORY_KEYS),
        company: z.enum(COMPANY_KEYS).optional().describe("solo or partner, omit if unknown"),
        delivery_only: z.boolean().optional(),
      }),
      execute: safe(
        "suggest_meals",
        async ({
          category,
          company,
          delivery_only,
        }: {
          category: MealCategoryKey;
          company?: CompanyOptionKey;
          delivery_only?: boolean;
        }) => {
          await ensureDay(userId, profile, today);
          const day = await getDayData(userId, profile, today);
          const targets = mealFitTargets(profile, day.isGymDay);
          const bands = mealFitBands(profile, day.isGymDay);
          const remaining = remainingOf(day.totals, targets);
          const catalog = await getCatalog(userId);
          const weekday = weekdayOf(today);

          const candidates = filterRotation(catalog, {
            weekday,
            category,
            company,
            deliveryOnly: delivery_only,
          }).filter((item): item is CatalogItem & Macros => hasMacros(item));

          const items = candidates
            .filter((item) => fits(item, remaining, bands))
            .map((item) => ({
              id: item.id,
              name: item.name,
              place: item.place,
              protein_g: item.protein_g,
              fat_g: item.fat_g,
              carbs_g: item.carbs_g,
              kcal: round(kcalOf(item)),
              remaining_after: {
                protein_g: round(remaining.protein_g - item.protein_g),
                fat_g: round(remaining.fat_g - item.fat_g),
                carbs_g: round(remaining.carbs_g - item.carbs_g),
                kcal: round(remaining.kcal - kcalOf(item)),
              },
            }))
            .sort((a, b) => b.protein_g - a.protein_g)
            .slice(0, SUGGEST_MEALS_LIMIT);

          return { category, items };
        },
      ),
    }),
    search_catalog: tool({
      description:
        "Search the user's saved food catalog by name or place. Each result carries the `id` you must pass to log_meal together with its exact `name`. Pass every term worth trying in one call: they are searched together. The catalog is stored in the words the user typed, often English even when they ask in another language, so include the English translation of each term alongside the original. When nothing matches the terms it returns a sample spread across the user's places, so a miss is not an empty catalog. Read the `note` field: it tells you what the result actually is. A macro of null means that number was never recorded: say so instead of guessing it.",
      inputSchema: z.object({
        queries: z.array(z.string().trim().min(1)).min(1),
      }),
      execute: safe("search_catalog", ({ queries }: { queries: string[] }) =>
        searchCatalog(userId, queries),
      ),
    }),
    get_workouts: tool({
      description:
        "Get the user's most recent workouts. Returns up to `limit` sessions, the newest ones with exercises and sets.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(10).describe("How many recent sessions"),
      }),
      execute: safe("get_workouts", async ({ limit }: { limit: number }) => {
        const recent = await getRecentWorkouts(userId, limit);
        const hydrated = await Promise.all(
          recent.slice(0, HYDRATED_WORKOUTS).map((workout) => hydrateWorkout(userId, workout)),
        );
        return {
          workouts: hydrated.map((workout) => ({
            day: workout.logical_day,
            label: workout.label,
            exercises: workout.exercises.map((exercise) => ({
              name: exercise.name,
              sets: exercise.sets.map((set) => ({
                reps: set.reps,
                weight: set.weight,
                per_side: set.per_side,
                is_pr: set.is_pr,
              })),
            })),
          })),
          older: recent.slice(HYDRATED_WORKOUTS).map((workout) => ({
            day: workout.logical_day,
            label: workout.label,
          })),
        };
      }),
    }),
    get_body_scans: tool({
      description:
        "Get the user's latest InBody body scans (weight, skeletal muscle, body fat, visceral fat).",
      inputSchema: z.object({}),
      execute: safe("get_body_scans", async () => {
        const scans = await recentScans(userId, SCAN_LIMIT);
        return {
          scans: scans.map((scan) => ({
            taken_at: scan.taken_at.toISOString().slice(0, 10),
            weight_kg: scan.weight_kg,
            skeletal_muscle_kg: scan.skeletal_muscle_kg,
            body_fat_pct: scan.body_fat_pct,
            visceral_fat_level: scan.visceral_fat_level,
          })),
        };
      }),
    }),
    check_progression_eligible: tool({
      description:
        `Check whether the user's last ${PROGRESSION_SESSIONS_REQUIRED} sessions of a given exercise were both "clean" (reps held steady or increased across every set, no set finishing weaker than it started). This is the signal to raise the weight next time. Pass the exact exercise name, e.g. from get_workouts. Read-only, no confirmation needed.`,
      inputSchema: z.object({
        exercise_name: z
          .string()
          .trim()
          .min(1)
          .describe("exact exercise name, e.g. from get_workouts"),
      }),
      execute: safe(
        "check_progression_eligible",
        async ({ exercise_name }: { exercise_name: string }) => {
          const sessions = await getExerciseSessions(
            userId,
            exercise_name,
            PROGRESSION_SESSIONS_REQUIRED,
          );
          const result = evaluateProgression(sessions);
          return {
            exercise: exercise_name,
            eligible: result.eligible,
            reason: result.reason,
          };
        },
      ),
    }),
    get_todays_routine: tool({
      description:
        "Today's prescribed routine from the user's saved split: exercises, target sets x reps, prescribed weight and whether it was raised after 2 clean sessions. Read-only.",
      inputSchema: z.object({}),
      execute: safe("get_todays_routine", () => getTodaysRoutine(userId, today)),
    }),
    get_progress_overview: tool({
      description:
        "Get the user's full progress arc since they started using the app: every InBody scan on record, not just the latest, the day they first logged a meal or workout, how many distinct days they have logged meals since, and their average fatigue/energy score over the last two weeks. Use this for a weekly or overall progress summary, comparing against where the user started, never for a single day's question.",
      inputSchema: z.object({}),
      execute: safe("get_progress_overview", async () => {
        const scans = await recentScans(userId, PROGRESS_SCAN_LIMIT);

        const [firstMeal] = await db
          .select({ day: meals.logical_day })
          .from(meals)
          .where(eq(meals.user_id, userId))
          .orderBy(meals.logical_day)
          .limit(1);
        const [firstWorkout] = await db
          .select({ day: workouts.logical_day })
          .from(workouts)
          .where(eq(workouts.user_id, userId))
          .orderBy(workouts.logical_day)
          .limit(1);
        const starts = [firstMeal?.day, firstWorkout?.day].filter(
          (day): day is string => Boolean(day),
        );
        const firstLoggedDay = starts.length
          ? starts.reduce((a, b) => (a < b ? a : b))
          : null;

        const [activeDays] = await db
          .select({ value: countDistinct(meals.logical_day) })
          .from(meals)
          .where(eq(meals.user_id, userId));

        const fatigueWindowStart = shiftDay(
          today,
          -(PROGRESS_FATIGUE_WINDOW_DAYS - 1),
        );
        const fatigue = await recentFatigueAverage(userId, fatigueWindowStart);
        const [latestWaist, latestWeight] = await Promise.all([
          getLatestMeasurement(userId, "waist"),
          getLatestMeasurement(userId, "weight"),
        ]);

        return {
          first_logged_day: firstLoggedDay,
          distinct_days_with_meals_logged: activeDays?.value ?? 0,
          fatigue_last_14_days:
            fatigue == null
              ? null
              : { average_score: round(fatigue.average, 1), entries: fatigue.count },
          latest_waist_cm: latestWaist?.value != null
            ? { value: latestWaist.value, day: latestWaist.logical_day }
            : null,
          latest_weight_kg: latestWeight?.value != null
            ? { value: latestWeight.value, day: latestWeight.logical_day }
            : null,
          scans: scans.map((scan) => ({
            taken_at: scan.taken_at.toISOString().slice(0, 10),
            weight_kg: scan.weight_kg,
            skeletal_muscle_kg: scan.skeletal_muscle_kg,
            body_fat_pct: scan.body_fat_pct,
            visceral_fat_level: scan.visceral_fat_level,
          })),
        };
      }),
    }),
    get_upcoming_reminders: tool({
      description:
        "Get overdue/upcoming reminders you should raise proactively: progress photo (default every 4 weeks), waist measurement (default every 2 weeks), the next InBody scan if the user set a cadence for it, and any standing rule stored as a `..._end_date` (e.g. a treatment or medication end date). Read-only, no confirmation needed. Reminders already due are also included automatically in your context every turn, so you rarely need to call this yourself; use it if you want to double-check before mentioning one.",
      inputSchema: z.object({}),
      execute: safe("get_upcoming_reminders", async () => {
        const reminders = await getUpcomingReminders(userId, dayConfig(profile), today);
        return { reminders };
      }),
    }),
  };
  if (!allowWrite) return readTools;
  return {
    ...readTools,
    log_meal: tool({
      description:
        "Log a meal the user has eaten, using an item from their catalog. Only call this when the user asks for it. Pass the `id` and the exact `name` of a catalog item a previous search returned: the app resolves the macros itself from that item, so never pass macro numbers. Use `portions` when they ate more or less than one serving. The user confirms before anything is written.",
      inputSchema: z.object({
        item_id: z.string().min(1).describe("id of the catalog item, from search_catalog"),
        item_name: z.string().min(1).describe("exact name of that same catalog item"),
        category: z.enum(CATEGORY_KEYS),
        portions: z
          .number()
          .positive()
          .max(MAX_PORTIONS)
          .default(1)
          .describe("servings of that item, 1 unless the user says otherwise"),
      }),
      execute: safeWithCallId(
        "log_meal",
        async (input: LogMealInput, toolCallId: string) => {
          const override =
            logMealOverride?.toolCallId === toolCallId
              ? logMealOverride
              : undefined;
          const resolved = await resolveCatalogMeal(userId, {
            itemId: override?.itemId ?? input.item_id,
            itemName: override?.itemName ?? input.item_name,
            portions: input.portions,
          });
          if (!resolved.ok) return { logged: false, error: resolved.error };

          await insertResolvedMeal(
            userId,
            resolved.meal,
            input.category,
            today,
          );
          revalidatePath("/");
          return {
            logged: true,
            meal: {
              name: resolved.meal.name,
              category: input.category,
              portions: resolved.meal.portions,
              protein_g: resolved.meal.protein_g,
              fat_g: resolved.meal.fat_g,
              carbs_g: resolved.meal.carbs_g,
              kcal: resolved.meal.kcal,
            },
          };
        },
      ),
    }),
    update_rule: tool({
      description:
        "Set or change a standing rule for this user: a fixed operational fact the coach must always follow until it is changed again, e.g. medication timing, a dietary restriction, routine split, or a reminder cadence. Use a short snake_case `key` naming the rule and the exact `value`. Setting an existing key replaces its value; the previous value stops applying. Only call this when the user asks to set or change a rule, never for a one-off preference (that belongs in memory, not here). The user confirms before anything is written." +
        ` Reserved keys read by the reminder system, use these EXACT keys and formats or the reminder never fires: ${CADENCE_DEFS.map((d) => `\`${d.ruleKey}\``).join(", ")} take an integer number of days as the value, e.g. key "${CADENCE_DEFS[2].ruleKey}" value "21" for "recordame el InBody cada 21 días". Any key ending in "${TREATMENT_END_SUFFIX}" (e.g. "creatine${TREATMENT_END_SUFFIX}") takes a value in exactly YYYY-MM-DD format, e.g. key "creatine${TREATMENT_END_SUFFIX}" value "2026-08-30" for "estoy tomando creatina hasta el 30 de agosto". Never invent a differently-named or differently-formatted key for these two cases.`,
      inputSchema: z.object({
        key: z
          .string()
          .trim()
          .min(1)
          .describe(
            `short snake_case name for the rule, e.g. medication_timing. For reminder cadences and treatment end dates use the reserved keys and formats from the tool description (${CADENCE_DEFS.map((d) => d.ruleKey).join(", ")}, or any key ending in ${TREATMENT_END_SUFFIX})`,
          ),
        value: z
          .string()
          .trim()
          .min(1)
          .max(300)
          .describe(
            "the exact rule value to store. For reminder cadence keys, an integer number of days. For *_end_date keys, exactly YYYY-MM-DD",
          ),
      }),
      execute: safe(
        "update_rule",
        async (input: { key: string; value: string }) => {
          const key = normalizedRuleKey(input.key);
          if (!key) {
            return { logged: false, error: "The rule key was empty." };
          }
          await saveRule(userId, key, input.value);
          return { logged: true, rule: { key, value: input.value } };
        },
      ),
    }),
    log_fatigue: tool({
      description:
        "Log the user's fatigue/energy score (1-5) and/or sleep info for a moment of the day: morning or post_lunch. All three fields (score, sleep_hours, sleep_location) are optional and independent: pass a field only when the user mentioned it in THIS message, leave it null otherwise, and logging the same time_of_day again today only overwrites the fields you pass, it never blanks out a field the user already logged earlier with a null from a later call that didn't mention it. If the user only mentions sleep (e.g. 'dormí 6 horas') without saying how they felt, call this with score null to save the sleep data, but you MUST still ask them for the energy score in your reply so it can be logged in a follow-up turn. The user confirms before anything is written.",
      inputSchema: z.object({
        time_of_day: z
          .enum(TIME_OF_DAY_KEYS)
          .describe("morning or post_lunch"),
        score: fatigueScoreSchema.describe(
          "fatigue/energy score, 1 (exhausted) to 5 (fresh); null if the user didn't say",
        ),
        sleep_hours: fatigueSleepHoursSchema.describe(
          "hours slept, only if the user mentioned it (0 is valid for an all-nighter)",
        ),
        sleep_location: fatigueSleepLocationSchema.describe(
          "where they slept, only if it wasn't their usual bed",
        ),
      }),
      execute: safe(
        "log_fatigue",
        async (input: {
          time_of_day: string;
          score: number | null;
          sleep_hours: number | null;
          sleep_location: string | null;
        }) => {
          await saveFatigueLog(userId, {
            logical_day: today,
            time_of_day: input.time_of_day,
            score: input.score,
            sleep_hours: input.sleep_hours,
            sleep_location: input.sleep_location,
          });
          return {
            logged: true,
            fatigue: {
              time_of_day: input.time_of_day,
              score: input.score,
              sleep_hours: input.sleep_hours,
              sleep_location: input.sleep_location,
            },
          };
        },
      ),
    }),
    log_workout_session: tool({
      description:
        "Log a completed gym session: which exercises, and for each one its sets with reps and weight (per_side true when the weight is per dumbbell/side rather than total). The sets array needs ONE ENTRY PER SET actually performed: \"3x8 at 60kg\" is three separate set objects, each {reps: 8, weight: 60}, never one entry meant to summarize all three. Only call this when the user reports what they actually did in the gym. session_type is a short label like \"Upper A\". Pass exercise_catalog_id only when you have a real id (e.g. from get_workouts or a catalog search); omit it entirely otherwise, never pass null, and the app will try to match the exercise by name itself. weight can be null for bodyweight sets. The user confirms before anything is written.",
      inputSchema: logWorkoutSessionInput,
      execute: safe(
        "log_workout_session",
        async (input: z.infer<typeof logWorkoutSessionInput>) => {
          const resolved = await resolveWorkoutSession(
            input as WorkoutSessionInput,
          );
          await insertWorkoutSession(userId, today, resolved);
          await applyProgression(userId, today, resolved.label, dayConfig(profile));
          revalidatePath("/workout");
          return {
            logged: true,
            session: {
              label: resolved.label,
              exercises: resolved.exercises.map((exercise) => ({
                name: exercise.name,
                sets: exercise.sets,
              })),
            },
          };
        },
      ),
    }),
    log_measurement: tool({
      description:
        "Log a body measurement: waist (cm) or weight (kg) with its value, or a progress photo (no value, just marks that one was taken today). Only call this when the user reports a measurement or confirms they took a progress photo. Never invent a value. The user confirms before anything is written.",
      inputSchema: z.object({
        type: measurementTypeSchema.describe("waist, weight, or photo"),
        value: measurementValueSchema.describe(
          "the measured value, cm for waist or kg for weight; omit or pass null for photo",
        ),
      }),
      execute: safe(
        "log_measurement",
        async (input: { type: string; value: number | null }) => {
          const value = input.type === "photo" ? null : input.value;
          await saveMeasurement(userId, {
            type: input.type,
            value,
            logical_day: today,
          });
          return {
            logged: true,
            measurement: { type: input.type, value },
          };
        },
      ),
    }),
  };
}
