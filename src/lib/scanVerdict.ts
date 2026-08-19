import type { ScanDelta } from "@/lib/data/bodyScans";

export function scanVerdict(delta: ScanDelta): string | null {
  const muscle = delta.skeletal_muscle_kg;
  const fat = delta.body_fat_kg;
  if (muscle == null || fat == null) return null;
  const flat = (n: number) => Math.abs(n) <= 0.3;
  if (flat(muscle) && flat(fat))
    return `Little movement in ${delta.days} days.`;
  if (muscle > 0 && fat < 0) return "Recomposition. Muscle up, fat down.";
  if (muscle > 0 && fat > 0) return "Gaining both. Consider trimming calories.";
  if (muscle < 0 && fat < 0)
    return "Losing both. Protein or the deficit is too aggressive.";
  if (flat(muscle) && fat < 0)
    return "Fat down, muscle held. That is the goal.";
  return "Muscle down while fat holds. Check protein and training.";
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
