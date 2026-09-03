import type { Profile } from "@/lib/db/schema";
import { round } from "@/lib/utils";

export interface Macros {
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export interface PartialMacros {
  protein_g: number | null | undefined;
  fat_g: number | null | undefined;
  carbs_g: number | null | undefined;
}

export function kcalOf(m: Macros): number {
  return m.protein_g * 4 + m.carbs_g * 4 + m.fat_g * 9;
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce(
    (acc, m) => ({
      protein_g: acc.protein_g + m.protein_g,
      fat_g: acc.fat_g + m.fat_g,
      carbs_g: acc.carbs_g + m.carbs_g,
    }),
    { protein_g: 0, fat_g: 0, carbs_g: 0 },
  );
}

export function carbTarget(profile: Profile, isGymDay: boolean): number {
  return isGymDay ? profile.carbs_gym : profile.carbs_rest;
}

export function caloriesTarget(profile: Profile, isGymDay: boolean): number {
  return isGymDay ? profile.calories_target : profile.calories_rest;
}

export type MacroState = "low" | "under" | "ok" | "high" | "over";

export interface MacroLine {
  key: "protein" | "fat" | "carbs" | "calories";
  current: number;
  target: number;
  remaining: number;
  pct: number;
  state: MacroState;
  warn: boolean;
}

// Non-alarmist rules:
// - protein is the priority: warn only when low (deficit hurts muscle).
// - fat is a target range AND a floor: warn when below floor or far above max;
//   being slightly low is "under" (gentle), not a win.
// - carbs/calories track the deficit; high fat with calories in range is not a
//   warning (caller decides tone using `warn`).
export function macroSummary(
  totals: Macros,
  profile: Profile,
  isGymDay: boolean,
): { lines: MacroLine[]; kcal: number; kcalTarget: number } {
  const kcal = kcalOf(totals);
  const carbs = carbTarget(profile, isGymDay);
  const kcalTarget = caloriesTarget(profile, isGymDay);

  const proteinState: MacroState =
    totals.protein_g < profile.protein_target * 0.9 ? "low" : "ok";

  let fatState: MacroState;
  if (totals.fat_g < profile.fat_floor) fatState = "low";
  else if (totals.fat_g < profile.fat_min) fatState = "under";
  else if (totals.fat_g <= profile.fat_max) fatState = "ok";
  else fatState = "high";

  const calsState: MacroState =
    kcal > kcalTarget * 1.1
      ? "over"
      : kcal < kcalTarget * 0.8
        ? "under"
        : "ok";

  const lines: MacroLine[] = [
    line("protein", totals.protein_g, profile.protein_target, proteinState),
    line("fat", totals.fat_g, profile.fat_max, fatState),
    line("carbs", totals.carbs_g, carbs, calsState === "over" ? "over" : "ok"),
    line("calories", kcal, kcalTarget, calsState),
  ];

  return { lines, kcal, kcalTarget };
}

function line(
  key: MacroLine["key"],
  current: number,
  target: number,
  state: MacroState,
): MacroLine {
  const remaining = round(target - current, 0);
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const warn =
    (key === "protein" && state === "low") ||
    (key === "fat" && (state === "low" || state === "high")) ||
    (key === "calories" && state === "over");
  return { key, current: round(current, 0), target: round(target, 0), remaining, pct, state, warn };
}

export function known(macro: number | null | undefined): macro is number {
  return typeof macro === "number" && Number.isFinite(macro);
}

export function hasMacros(item: PartialMacros): item is Macros {
  return known(item.protein_g) && known(item.fat_g) && known(item.carbs_g);
}

export function hasAnyMacro(item: PartialMacros): boolean {
  return known(item.protein_g) || known(item.fat_g) || known(item.carbs_g);
}
