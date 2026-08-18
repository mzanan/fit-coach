import type { WorkoutSet } from "@/lib/db/schema";
import type { HistorySet } from "@/lib/workoutHistory";

export function prefillFrom(
  lastCurrentSet: WorkoutSet | null,
  lastSessionTop: HistorySet | null,
) {
  const source = lastCurrentSet ?? lastSessionTop;
  return {
    reps: source?.reps != null ? String(source.reps) : "",
    weight: source?.weight != null ? String(source.weight) : "",
    perSide: source?.per_side ?? false,
  };
}
