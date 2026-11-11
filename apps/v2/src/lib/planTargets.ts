import type { Targets } from "@/lib/targets";

export const TARGET_KEYS = [
  "protein_target",
  "fat_min",
  "fat_max",
  "fat_floor",
  "carbs_gym",
  "carbs_rest",
  "calories_target",
  "calories_rest",
] as const satisfies readonly (keyof Targets)[];

export function pickTargets(source: Record<(typeof TARGET_KEYS)[number], number | null>): Targets | null {
  const entries = TARGET_KEYS.map((key) => [key, source[key]] as const);
  if (entries.some(([, value]) => value == null)) return null;
  return Object.fromEntries(entries) as unknown as Targets;
}

export function sameTargets(a: Targets | null, b: Targets | null): boolean {
  if (!a || !b) return a === b;
  return TARGET_KEYS.every((key) => a[key] === b[key]);
}
