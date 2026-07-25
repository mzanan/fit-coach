"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import type { PreviewWorkout } from "@/components/import/useMdImport";

export function ImportWorkoutRow({
  workout,
  onToggle,
}: {
  workout: PreviewWorkout;
  onToggle: (include: boolean) => void;
}) {
  const w = workout.workout;
  const setCount = w.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <div className="flex items-start gap-3 py-2.5">
      <Checkbox
        checked={workout.include}
        onChange={onToggle}
        aria-label={`Include workout ${w.label ?? ""}`}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">{w.label || "Workout"}</span>
        <p className="text-xs text-muted-foreground">
          {w.exercises.length} exercises · {setCount} sets
          {w.exercises.length
            ? ` · ${w.exercises.map((e) => e.name).join(", ")}`
            : ""}
        </p>
      </div>
    </div>
  );
}
