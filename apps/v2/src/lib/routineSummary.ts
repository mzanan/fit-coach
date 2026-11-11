import type { RoutineExercise } from "@/lib/db/schema";

type PrescriptionFields = Pick<
  RoutineExercise,
  "target_sets" | "target_reps" | "reps_max" | "target_seconds" | "target_rir" | "rest_seconds"
>;

type SummaryFields = PrescriptionFields &
  Pick<RoutineExercise, "current_weight" | "per_side" | "increment_kg">;

function formatRest(seconds: number): string {
  if (seconds < 60 || seconds % 60 !== 0) return `${seconds}s rest`;
  return `${seconds / 60} min rest`;
}

function formatReps(exercise: PrescriptionFields): string {
  if (exercise.target_seconds) return `${exercise.target_seconds}s`;
  if (exercise.reps_max && exercise.reps_max > exercise.target_reps) {
    return `${exercise.target_reps}-${exercise.reps_max}`;
  }
  return `${exercise.target_reps}`;
}

export function routinePrescription(exercise: PrescriptionFields): string {
  const parts = [`${exercise.target_sets} x ${formatReps(exercise)}`];
  if (exercise.target_rir != null) parts.push(`RIR ${exercise.target_rir}`);
  if (exercise.rest_seconds != null) parts.push(formatRest(exercise.rest_seconds));
  return parts.join(" · ");
}

export function routineExerciseSummary(exercise: SummaryFields): string {
  const weight = exercise.current_weight == null ? "BW" : `${exercise.current_weight} kg`;
  const side = exercise.per_side ? "/side" : "";
  const [setsReps, ...rest] = routinePrescription(exercise).split(" · ");
  return [setsReps, `${weight}${side}`, ...rest, `+${exercise.increment_kg}kg`].join(" · ");
}
