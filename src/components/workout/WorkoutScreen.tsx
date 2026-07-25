"use client";

import { Trash2 } from "lucide-react";

import { AddExercise } from "@/components/workout/AddExercise";
import { ExerciseCard } from "@/components/workout/ExerciseCard";
import { StartWorkout } from "@/components/workout/StartWorkout";
import { deleteWorkout } from "@/lib/actions/workouts";
import type { WorkoutFull } from "@/lib/data/workouts";
import { useAction } from "@/hooks/useAction";

export function WorkoutScreen({
  workout,
  day,
}: {
  workout: WorkoutFull | null;
  day: string;
}) {
  const { pending, run } = useAction();

  if (!workout) {
    return <StartWorkout day={day} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">
          {workout.label ?? "Session"}
        </span>
        <button
          type="button"
          aria-label="Delete workout"
          disabled={pending}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          onClick={() => {
            if (!confirm("Delete the whole session?")) return;
            run(() => deleteWorkout(workout.id));
          }}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {workout.exercises.map((ex) => (
        <ExerciseCard key={ex.id} exercise={ex} />
      ))}

      <AddExercise workoutId={workout.id} />
    </div>
  );
}
