import "server-only";

import { count, desc, eq } from "drizzle-orm";
import { tool, type ToolSet } from "ai";
import { z } from "zod";

import { getCatalog } from "@/lib/data/catalog";
import { getDayData } from "@/lib/data/today";
import { getRecentWorkouts, hydrateWorkout } from "@/lib/data/workouts";
import { db, schema } from "@/lib/db";
import type { Profile } from "@/lib/db/schema";
import { normalizeSearch } from "@/lib/search";
import { round } from "@/lib/utils";

const { body_scans, meals } = schema;

const HYDRATED_WORKOUTS = 3;
const CATALOG_RESULTS = 8;
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

export function buildCoachTools(
  userId: string,
  profile: Profile,
  today: string,
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
        "Search the user's saved food catalog by name or place. Pass every term worth trying in one call: they are searched together. The catalog is stored in the words the user typed, often English even when they ask in another language, so include the English translation of each term alongside the original. Returns the user's most eaten items when nothing matches. A macro of null means that number was never recorded: say so instead of guessing it.",
      inputSchema: z.object({
        queries: z.array(z.string().trim().min(1)).min(1),
      }),
      execute: safe(
        "search_catalog",
        async ({ queries }: { queries: string[] }) => {
          const terms = queries
            .slice(0, MAX_QUERY_TERMS)
            .map(normalizeSearch)
            .filter(Boolean);
          const items = (await getCatalog(userId)).filter(
            (item) => !item.archived,
          );
          const hits = terms.length
            ? items.filter((item) =>
                terms.some(
                  (term) =>
                    normalizeSearch(item.name).includes(term) ||
                    (item.place
                      ? normalizeSearch(item.place).includes(term)
                      : false),
                ),
              )
            : [];
          const matched = hits.length > 0;
          const chosen = matched
            ? hits
            : await mostEaten(userId, items, CATALOG_RESULTS);
          return {
            matched,
            items: chosen.slice(0, CATALOG_RESULTS).map((item) => ({
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
