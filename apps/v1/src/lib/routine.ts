import { weekdayOf } from "@/lib/dates";
import { evaluateProgression, type HistorySet } from "@/lib/workoutHistory";

export interface RoutineExerciseWeight {
  current_weight: number | null;
  increment_kg: number;
}

export interface RoutineSession {
  day: string;
  sets: HistorySet[];
}

export interface NextWeightResult {
  weight: number | null;
  raise: boolean;
  reason: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function nextWeight(
  exercise: RoutineExerciseWeight,
  sessions: RoutineSession[],
): NextWeightResult {
  const evaluation = evaluateProgression(sessions);
  if (!evaluation.eligible) {
    return {
      weight: exercise.current_weight,
      raise: false,
      reason: evaluation.reason,
    };
  }
  if (exercise.current_weight == null) {
    return {
      weight: null,
      raise: false,
      reason: "No current weight recorded yet, cannot raise it.",
    };
  }
  return {
    weight: round2(exercise.current_weight + exercise.increment_kg),
    raise: true,
    reason: evaluation.reason,
  };
}

export interface RoutineSlotLike {
  weekday: number;
  label: string;
}

export function todaysLabel(slots: RoutineSlotLike[], day: string): string | null {
  const weekday = weekdayOf(day);
  return slots.find((slot) => slot.weekday === weekday)?.label ?? null;
}
