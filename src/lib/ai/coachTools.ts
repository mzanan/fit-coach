import "server-only";

import { desc, eq } from "drizzle-orm";
import { tool, type ToolSet } from "ai";
import { z } from "zod";

import { getCatalog } from "@/lib/data/catalog";
import { getDayData } from "@/lib/data/today";
import { getRecentWorkouts, hydrateWorkout } from "@/lib/data/workouts";
import { db, schema } from "@/lib/db";
import type { Profile } from "@/lib/db/schema";
import { normalizeSearch } from "@/lib/search";
import { round } from "@/lib/utils";

const { body_scans } = schema;

const HYDRATED_WORKOUTS = 3;
const CATALOG_RESULTS = 8;
const SCAN_LIMIT = 2;

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
      execute: async () => {
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
      },
    }),
    search_catalog: tool({
      description:
        "Search the user's saved food catalog by name or place. Returns items with exact macros.",
      inputSchema: z.object({ query: z.string().trim().min(1) }),
      execute: async ({ query }) => {
        const q = normalizeSearch(query);
        if (!q) return { items: [] };
        const items = await getCatalog(userId);
        return {
          items: items
            .filter(
              (item) =>
                !item.archived &&
                (normalizeSearch(item.name).includes(q) ||
                  (item.place ? normalizeSearch(item.place).includes(q) : false)),
            )
            .slice(0, CATALOG_RESULTS)
            .map((item) => ({
              name: item.name,
              place: item.place,
              protein_g: item.protein_g,
              fat_g: item.fat_g,
              carbs_g: item.carbs_g,
              fat_quality: item.fat_quality,
            })),
        };
      },
    }),
    get_workouts: tool({
      description:
        "Get the user's most recent workouts. Returns up to `limit` sessions, the newest ones with exercises and sets.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(10).describe("How many recent sessions"),
      }),
      execute: async ({ limit }) => {
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
      },
    }),
    get_body_scans: tool({
      description:
        "Get the user's latest InBody body scans (weight, skeletal muscle, body fat, visceral fat).",
      inputSchema: z.object({}),
      execute: async () => {
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
      },
    }),
  };
}
