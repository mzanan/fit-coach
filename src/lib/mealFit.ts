import { KCAL_TOLERANCE, MACRO_TOLERANCE_PCT, type MealCategoryKey } from "@/lib/constants";
import type { CatalogItem } from "@/lib/db/schema";
import { caloriesTarget, carbTarget, kcalOf, type Macros } from "@/lib/macros";
import type { Targets } from "@/lib/targets";

export interface MealFitTargets {
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  kcal: number;
}

export interface Remaining {
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  kcal: number;
}

export function remainingOf(totals: Macros, targets: MealFitTargets): Remaining {
  return {
    protein_g: targets.protein_g - totals.protein_g,
    fat_g: targets.fat_g - totals.fat_g,
    carbs_g: targets.carbs_g - totals.carbs_g,
    kcal: targets.kcal - kcalOf(totals),
  };
}

export function mealFitTargets(targets: Targets, isGymDay: boolean): MealFitTargets {
  return {
    protein_g: targets.protein_target,
    fat_g: targets.fat_max,
    carbs_g: carbTarget(targets, isGymDay),
    kcal: caloriesTarget(targets, isGymDay),
  };
}

export interface MealFitBands {
  fat_floor: number;
  fat_max: number;
  carbs_target: number;
  kcal_target: number;
}

export function mealFitBands(targets: Targets, isGymDay: boolean): MealFitBands {
  return {
    fat_floor: targets.fat_floor,
    fat_max: targets.fat_max,
    carbs_target: carbTarget(targets, isGymDay),
    kcal_target: caloriesTarget(targets, isGymDay),
  };
}

export function fits(item: Macros, remaining: Remaining, bands: MealFitBands): boolean {
  const fatTolerance = bands.fat_max * MACRO_TOLERANCE_PCT;
  if (item.fat_g > remaining.fat_g + fatTolerance) return false;

  const carbsTolerance = bands.carbs_target * MACRO_TOLERANCE_PCT;
  if (item.carbs_g > remaining.carbs_g + carbsTolerance) return false;

  if (kcalOf(item) > remaining.kcal + KCAL_TOLERANCE) return false;

  return true;
}

export function parseClosedWeekdays(value: string | null | undefined): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6);
}

export function serializeClosedWeekdays(weekdays: number[] | null | undefined): string | null {
  if (!weekdays || weekdays.length === 0) return null;
  return weekdays.join(",");
}

export interface RotationFilter {
  weekday: number;
  category?: MealCategoryKey | string;
  company?: string | null;
  deliveryOnly?: boolean;
}

export function filterRotation(
  items: CatalogItem[],
  filter: RotationFilter,
): CatalogItem[] {
  return items.filter((item) => {
    if (parseClosedWeekdays(item.closed_weekdays).includes(filter.weekday)) return false;
    if (item.dinner_only && filter.category !== "dinner") return false;
    if (filter.company && item.company && item.company !== filter.company) return false;
    if (filter.deliveryOnly && !item.delivery) return false;
    return true;
  });
}
