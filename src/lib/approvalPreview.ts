import {
  CLOSE_DAY_TOOL,
  FATIGUE_TOOL,
  MEASUREMENT_TOOL,
  RULE_TOOL,
  WORKOUT_TOOL,
  WRITE_TOOL,
} from "@/lib/constants";
import type {
  CloseDayPreview,
  LogFatiguePreview,
  LogMeasurementPreview,
  LogMealPreview,
  LogWorkoutSessionPreview,
  PendingPreview,
  UpdateRulePreview,
} from "@/lib/data/coachPendingWrite";
import { kcalOf } from "@/lib/macros";

export interface DisplayOption {
  id: string;
  name: string;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  kcal: number;
}

export interface PreviewKind {
  id: "meal" | "rule" | "fatigue" | "workout" | "measurement" | "close_day";
  count: number;
  question: { singular: string; plural: string };
  confirm: { singular: string; plural: string };
}

export function isMealPreview(preview: PendingPreview): preview is LogMealPreview {
  return preview.toolName === WRITE_TOOL;
}

export function isRulePreview(preview: PendingPreview): preview is UpdateRulePreview {
  return preview.toolName === RULE_TOOL;
}

export function isFatiguePreview(
  preview: PendingPreview,
): preview is LogFatiguePreview {
  return preview.toolName === FATIGUE_TOOL;
}

export function isWorkoutPreview(
  preview: PendingPreview,
): preview is LogWorkoutSessionPreview {
  return preview.toolName === WORKOUT_TOOL;
}

export function isMeasurementPreview(
  preview: PendingPreview,
): preview is LogMeasurementPreview {
  return preview.toolName === MEASUREMENT_TOOL;
}

export function isCloseDayPreview(
  preview: PendingPreview,
): preview is CloseDayPreview {
  return preview.toolName === CLOSE_DAY_TOOL;
}

export function weightOf(name: string): number {
  const match = /^\s*([\d.,]+)/.exec(name);
  return match ? parseFloat(match[1].replace(",", ".")) : Number.MAX_SAFE_INTEGER;
}

export function optionsOf(preview: LogMealPreview): DisplayOption[] {
  const portions = preview.portions || 1;
  const options = [
    {
      id: preview.itemId,
      name: preview.name,
      protein_g: preview.protein_g / portions,
      fat_g: preview.fat_g / portions,
      carbs_g: preview.carbs_g / portions,
      kcal: preview.kcal / portions,
    },
    ...preview.variants,
  ];
  return options.sort((a, b) => weightOf(a.name) - weightOf(b.name));
}

export function scaledOption(option: DisplayOption, portions: number): DisplayOption {
  if (portions === 1) return option;
  const scaled = {
    protein_g: Math.round(option.protein_g * portions),
    fat_g: Math.round(option.fat_g * portions),
    carbs_g: Math.round(option.carbs_g * portions),
  };
  return {
    ...option,
    ...scaled,
    kcal: Math.round(kcalOf(scaled)),
  };
}

export function activeKinds(kinds: PreviewKind[]): PreviewKind[] {
  return kinds.filter((k) => k.count > 0);
}

export function promptFor(kinds: PreviewKind[], ambiguous: boolean): string {
  const tail = "Nothing is written until you confirm.";
  const active = activeKinds(kinds);
  if (active.length > 1) return `Confirm these changes? ${tail}`;
  const only = active[0];
  if (only?.id === "meal" && ambiguous) return `Which one? ${tail}`;
  if (only) {
    return `${only.count === 1 ? only.question.singular : only.question.plural} ${tail}`;
  }
  return `Log this meal? ${tail}`;
}

export function confirmLabelFor(kinds: PreviewKind[]): string {
  const active = activeKinds(kinds);
  if (active.length > 1) return "Confirm";
  const only = active[0];
  if (only) return only.count === 1 ? only.confirm.singular : only.confirm.plural;
  return "Log it";
}
