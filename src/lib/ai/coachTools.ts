import "server-only";

import { countDistinct, desc, eq } from "drizzle-orm";
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
import { MEAL_CATEGORIES, type MealCategoryKey } from "@/lib/constants";
import type { PendingPreview } from "@/lib/data/coachPendingWrite";
import { getDayData } from "@/lib/data/today";
import { getRecentWorkouts, hydrateWorkout } from "@/lib/data/workouts";
import { db, schema } from "@/lib/db";
import type { Profile } from "@/lib/db/schema";
import { round } from "@/lib/utils";

const { body_scans, meals, workouts } = schema;

export const WRITE_TOOL = "log_meal";

const CATEGORY_KEYS = MEAL_CATEGORIES.map((c) => c.key) as [
  MealCategoryKey,
  ...MealCategoryKey[],
];

interface LogMealInput {
  item_id: string;
  item_name: string;
  category: MealCategoryKey;
  portions: number;
}

const HYDRATED_WORKOUTS = 3;
const SCAN_LIMIT = 2;
const PROGRESS_SCAN_LIMIT = 24;

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
  | { ok: true; preview: Omit<PendingPreview, "toolCallId"> }
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
        "Get today's logged meals, running macro totals and the user's daily targets, plus whether today is a gym day.",
      inputSchema: z.object({}),
      execute: safe("get_today", async () => {
        const day = await getDayData(userId, profile, today);
        return {
          day: day.day,
          isGymDay: day.isGymDay,
          targets: {
            protein_g: profile.protein_target,
            fat_min_g: profile.fat_min,
            fat_max_g: profile.fat_max,
            fat_floor_g: profile.fat_floor,
            carbs_g: day.isGymDay ? profile.carbs_gym : profile.carbs_rest,
            calories: profile.calories_target,
          },
          totals: {
            protein_g: round(day.totals.protein_g),
            fat_g: round(day.totals.fat_g),
            carbs_g: round(day.totals.carbs_g),
            kcal: round(day.summary.kcal),
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
        const scans = await db
          .select()
          .from(body_scans)
          .where(eq(body_scans.user_id, userId))
          .orderBy(desc(body_scans.taken_at))
          .limit(SCAN_LIMIT);
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
    get_progress_overview: tool({
      description:
        "Get the user's full progress arc since they started using the app: every InBody scan on record, not just the latest, the day they first logged a meal or workout, and how many distinct days they have logged meals since. Use this for a weekly or overall progress summary, comparing against where the user started, never for a single day's question.",
      inputSchema: z.object({}),
      execute: safe("get_progress_overview", async () => {
        const scans = await db
          .select()
          .from(body_scans)
          .where(eq(body_scans.user_id, userId))
          .orderBy(desc(body_scans.taken_at))
          .limit(PROGRESS_SCAN_LIMIT);

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

        return {
          first_logged_day: firstLoggedDay,
          distinct_days_with_meals_logged: activeDays?.value ?? 0,
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
  };
}
