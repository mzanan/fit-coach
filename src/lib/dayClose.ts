import type { Day } from "@/lib/db/schema";
import type { MacroLine } from "@/lib/macros";
import { round } from "@/lib/utils";

export function weeklyStepsAverage(days: Day[]): number | null {
  const logged = days.filter((d) => d.steps != null);
  if (!logged.length) return null;
  const total = logged.reduce((sum, d) => sum + (d.steps ?? 0), 0);
  return round(total / logged.length);
}

export function dayDeviations(
  summary: { lines: MacroLine[] },
  mealsLogged: number,
): MacroLine[] {
  if (mealsLogged === 0) return [];
  return summary.lines.filter((line) => line.state !== "ok");
}
