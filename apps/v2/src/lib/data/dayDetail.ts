import "server-only";

import { planFor } from "@/lib/data/plans";
import { getDayData } from "@/lib/data/today";
import { getWorkoutForDay } from "@/lib/data/workouts";
import type { Profile } from "@/lib/db/schema";
import { kcalOf } from "@/lib/macros";
import { toMealDto } from "@/lib/mealDto";
import { pickTargets } from "@/lib/planTargets";
import { round } from "@/lib/utils";

export async function getDayDetail(userId: string, profile: Profile, day: string) {
  const [data, workout, plan] = await Promise.all([
    getDayData(userId, profile, day),
    getWorkoutForDay(userId, day),
    planFor(userId, day),
  ]);
  return {
    day,
    day_type: data.dayRow?.day_type ?? data.dayType,
    steps: data.dayRow?.steps ?? null,
    notes: data.dayRow?.notes ?? null,
    closed: Boolean(data.dayRow?.closed_at),
    meals: data.meals.map(toMealDto),
    totals: { ...data.totals, kcal: round(kcalOf(data.totals)) },
    plan: plan ? { phase: plan.phase, effective_from: plan.effective_from } : null,
    targets: plan ? pickTargets(plan) : data.targets,
    workout: workout
      ? {
          label: workout.label,
          notes: workout.notes,
          exercises: workout.exercises.map((exercise) => ({
            name: exercise.name,
            exercise_catalog_id: exercise.exercise_catalog_id,
            notes: exercise.notes,
            sets: exercise.sets.map((set) => ({
              reps: set.reps,
              weight: set.weight,
              per_side: set.per_side,
              is_pr: set.is_pr,
            })),
          })),
        }
      : null,
  };
}
