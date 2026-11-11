import type { WriteOutput } from "@/lib/ai/provider";
import { hasSizePrefix } from "@/lib/sizeName";
import {
  categoryLabel,
  DELETE_MEAL_TOOL,
  ESTIMATE_TOOL,
  FATIGUE_TOOL,
  fatigueExtrasLabel,
  fatigueTimeLabel,
  MEASUREMENT_TOOL,
  measurementTypeLabel,
  measurementUnit,
  RULE_TOOL,
  UPDATE_MEAL_TOOL,
  WORKOUT_TOOL,
  WRITE_TOOL,
} from "@/lib/constants";

interface MealOutput {
  meal?: {
    name?: string;
    category?: string;
    portions?: number;
    protein_g?: number;
    fat_g?: number;
    carbs_g?: number;
    kcal?: number;
  };
}

interface RuleOutput {
  rule?: { key?: string; value?: string };
}

interface FatigueOutput {
  fatigue?: {
    time_of_day?: string;
    score?: number | null;
    sleep_hours?: number | null;
    sleep_location?: string | null;
  };
}

interface WorkoutOutput {
  session?: { label?: string; exercises?: { name?: string }[] };
}

interface MeasurementOutput {
  measurement?: { type?: string; value?: number | null };
}

function mealLine(output: unknown): string {
  const meal = (output as MealOutput)?.meal;
  if (!meal?.name) return "";
  const portions =
    meal.portions === 1 || meal.portions === undefined || hasSizePrefix(meal.name)
      ? ""
      : ` x${meal.portions}`;
  const category = meal.category
    ? ` as ${categoryLabel(meal.category).toLowerCase()}`
    : "";
  return `Logged ${meal.name}${portions}${category}: ${meal.protein_g}g protein, ${meal.fat_g}g fat, ${meal.carbs_g}g carbs, ${meal.kcal} kcal.`;
}

function estimatedMealLine(output: unknown): string {
  const line = mealLine(output);
  return line ? line.replace(/^Logged /, "Logged (aprox) ") : "";
}

interface MealEditOutput {
  day?: string;
  meal?: { name?: string; protein_g?: number; fat_g?: number; carbs_g?: number };
}

function updatedMealLine(output: unknown): string {
  const { day, meal } = (output as MealEditOutput) ?? {};
  if (!meal?.name) return "";
  return `Updated ${meal.name} on ${day}: ${meal.protein_g}g protein, ${meal.fat_g}g fat, ${meal.carbs_g}g carbs.`;
}

function deletedMealLine(output: unknown): string {
  const { day, meal } = (output as MealEditOutput) ?? {};
  if (!meal?.name) return "";
  return `Deleted ${meal.name} from ${day}.`;
}

function ruleLine(output: unknown): string {
  const rule = (output as RuleOutput)?.rule;
  if (!rule?.key) return "";
  return `Rule "${rule.key}" set to: ${rule.value}.`;
}

function fatigueLine(output: unknown): string {
  const fatigue = (output as FatigueOutput)?.fatigue;
  if (!fatigue?.time_of_day) return "";
  const extras = fatigueExtrasLabel(
    fatigue.sleep_hours ?? null,
    fatigue.sleep_location ?? null,
  );
  const label = fatigueTimeLabel(fatigue.time_of_day);
  if (fatigue.score == null) {
    return `Logged ${label} sleep${extras ? ` (${extras})` : ""}, energy score still pending.`;
  }
  return `Logged ${label} fatigue: ${fatigue.score}/5${extras ? ` (${extras})` : ""}.`;
}

function workoutLine(output: unknown): string {
  const session = (output as WorkoutOutput)?.session;
  if (!session) return "";
  const count = session.exercises?.length ?? 0;
  const label = session.label || "workout";
  return `Logged ${label}: ${count} exercise${count === 1 ? "" : "s"}.`;
}

function measurementLine(output: unknown): string {
  const measurement = (output as MeasurementOutput)?.measurement;
  if (!measurement?.type) return "";
  const label = measurementTypeLabel(measurement.type).toLowerCase();
  if (measurement.value == null) return `Logged ${label}.`;
  return `Logged ${label}: ${measurement.value}${measurementUnit(measurement.type)}.`;
}

const LINE_BUILDERS: Record<string, (output: unknown) => string> = {
  [WRITE_TOOL]: mealLine,
  [ESTIMATE_TOOL]: estimatedMealLine,
  [UPDATE_MEAL_TOOL]: updatedMealLine,
  [DELETE_MEAL_TOOL]: deletedMealLine,
  [RULE_TOOL]: ruleLine,
  [FATIGUE_TOOL]: fatigueLine,
  [WORKOUT_TOOL]: workoutLine,
  [MEASUREMENT_TOOL]: measurementLine,
};

export function writeReceipts(outputs: WriteOutput[]): string {
  return outputs
    .filter((output) => output.logged)
    .map((output) => LINE_BUILDERS[output.toolName]?.(output.output) ?? "")
    .filter(Boolean)
    .join("\n");
}

export type MemoryWrite =
  | { kind: "fact"; content: string }
  | { kind: "location"; location: string | null };

export function memoryReceipts(writes: MemoryWrite[]): string {
  return writes
    .map((write) =>
      write.kind === "fact"
        ? `Remembered: ${write.content}`
        : write.location
          ? `Current city set to ${write.location}.`
          : "Current city cleared.",
    )
    .join("\n");
}

export function learnedFacts(writes: MemoryWrite[]): string[] {
  return writes.flatMap((write) => (write.kind === "fact" ? [write.content] : []));
}
