import "server-only";

import { count, desc, eq } from "drizzle-orm";
import { tool, type ToolSet } from "ai";
import { z } from "zod";

import { revalidatePath } from "next/cache";

import {
  insertResolvedMeal,
  resolveCatalogMeal,
  sizeVariantKey,
  sizeVariantsOf,
  MAX_PORTIONS,
  type ResolveFailure,
} from "@/lib/catalogMeal";
import { MEAL_CATEGORIES, type MealCategoryKey } from "@/lib/constants";
import { getCatalog } from "@/lib/data/catalog";
import type { PendingPreview } from "@/lib/data/coachPendingWrite";
import { getDayData } from "@/lib/data/today";
import { getRecentWorkouts, hydrateWorkout } from "@/lib/data/workouts";
import { db, schema } from "@/lib/db";
import type { Profile } from "@/lib/db/schema";
import { hasMacros } from "@/lib/macros";
import { matchesTerm } from "@/lib/search";
import { round } from "@/lib/utils";

const { body_scans, meals } = schema;

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
const CATALOG_RESULTS = 8;
const CATALOG_SAMPLE = 12;
const SCAN_LIMIT = 2;
const MAX_QUERY_TERMS = 12;

async function mostEaten<T extends { id: string }>(
  userId: string,
  items: T[],
  limit: number,
): Promise<T[]> {
  const rows = await db
    .select({ id: meals.catalog_item_id, uses: count() })
    .from(meals)
    .where(eq(meals.user_id, userId))
    .groupBy(meals.catalog_item_id)
    .orderBy(desc(count()))
    .limit(limit);

  const ranking = new Map(
    rows
      .filter((row): row is { id: string; uses: number } => Boolean(row.id))
      .map((row, index) => [row.id, index]),
  );
  return [...items].sort(
    (a, b) =>
      (ranking.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (ranking.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

function placeCounts<T extends { place: string | null }>(
  items: T[],
): { place: string; items: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const place = item.place?.trim() || "No place";
    counts.set(place, (counts.get(place) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([place, count]) => ({ place, items: count }))
    .sort((a, b) => b.items - a.items);
}

function spreadByPlace<T extends { place: string | null }>(
  items: T[],
  limit: number,
): T[] {
  const byPlace = new Map<string, T[]>();
  for (const item of items) {
    const place = item.place?.trim() || "No place";
    const list = byPlace.get(place) ?? [];
    list.push(item);
    byPlace.set(place, list);
  }
  const queues = [...byPlace.values()];
  const picked: T[] = [];
  let round = 0;
  while (picked.length < limit && queues.some((q) => q.length > round)) {
    for (const queue of queues) {
      if (picked.length >= limit) break;
      const item = queue[round];
      if (item) picked.push(item);
    }
    round += 1;
  }
  return picked;
}

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
  logMealOverride?: LogMealOverride,
): ToolSet {
  return {
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
      execute: safe(
        "search_catalog",
        async ({ queries }: { queries: string[] }) => {
          const terms = queries
            .slice(0, MAX_QUERY_TERMS)
            .map((query) => query.trim())
            .filter(Boolean);
          const items = (await getCatalog(userId)).filter(
            (item) => !item.archived,
          );
          const hits = terms.length
            ? items.filter((item) =>
                terms.some(
                  (term) =>
                    matchesTerm(item.name, term) ||
                    (item.place ? matchesTerm(item.place, term) : false),
                ),
              )
            : [];
          const matched = hits.length > 0;
          const usableHits = hits.filter(hasMacros);
          const withMacros = items.filter(hasMacros);
          const sample = spreadByPlace(
            await mostEaten(
              userId,
              withMacros.length ? withMacros : items,
              CATALOG_SAMPLE,
            ),
            CATALOG_SAMPLE,
          );
          const chosen = matched
            ? [
                ...[...usableHits, ...hits.filter((item) => !hasMacros(item))].slice(
                  0,
                  CATALOG_RESULTS,
                ),
                ...(usableHits.length ? [] : sample),
              ]
            : sample;
          const chosenUsable = chosen.filter(hasMacros).length;
          console.info(
            `coach: search_catalog ${JSON.stringify(terms)} -> ${hits.length} hits (${usableHits.length} usable) of ${items.length}, returning ${chosen.length}`,
          );
          const sizeFamily = new Set(usableHits.map((item) => sizeVariantKey(item.name)));
          const note = !items.length
            ? "The user's catalog is empty. Tell them so and offer to add items; do not name any food as if it were saved."
            : !chosenUsable
              ? "None of these items has recorded macros, and neither does anything else in the catalog. Say that plainly and offer to fill the macros in; never invent numbers or a dish."
              : !matched
                ? "Nothing matched those terms, so these are a sample of the catalog across the user's places. Suggest from them; do not say the catalog is empty or that you found nothing."
                : usableHits.length > 1 && sizeFamily.size === 1
                  ? "These are the SAME item at different sizes. If the user is asking to log this, call log_meal with ANY one of them right now: the app will show them a card to pick the exact size before writing anything. Do not ask them to specify the size in chat."
                  : usableHits.length
                    ? undefined
                    : "The matched items have no recorded macros, and a sample of items WITH macros from the rest of the catalog follows them. Suggest from those.";
          return {
            query_matched: matched,
            catalog_size: items.length,
            items_with_macros: withMacros.length,
            places: placeCounts(items),
            note,
            items: chosen.map((item) => ({
              id: item.id,
              name: item.name,
              place: item.place,
              protein_g: item.protein_g,
              fat_g: item.fat_g,
              carbs_g: item.carbs_g,
              fat_quality: item.fat_quality,
            })),
          };
        },
      ),
    }),
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
  };
}
