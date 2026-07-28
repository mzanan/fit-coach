"use client";

import { AddExercise } from "@/components/workout/AddExercise";
import { ExerciseCard } from "@/components/workout/ExerciseCard";
import { StartWorkout } from "@/components/workout/StartWorkout";
import { EmptyState } from "@/components/ui/EmptyState";
import type { WorkoutFull, WorkoutHistory } from "@/lib/data/workouts";

export function WorkoutScreen({
  workout,
  day,
  history,
  historyAvailable,
  suggestedSplit,
}: {
  workout: WorkoutFull | null;
  day: string;
  history: WorkoutHistory;
  historyAvailable: boolean;
  suggestedSplit: string;
}) {
  if (!workout) {
    return (
      <StartWorkout day={day} lastLabel={history.lastLabel} suggestedSplit={suggestedSplit} />
    );
  }

  return (
    <div className="space-y-tight">
      {workout.exercises.length === 0 ? (
        <EmptyState
          size="sm"
          title="No exercises yet"
          body="Add your first exercise and start logging sets."
        />
      ) : (
        workout.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            day={day}
            history={history}
            historyAvailable={historyAvailable}
            index={i}
          />
        ))
      )}

      <AddExercise
        workoutId={workout.id}
        names={history.names}
        existingNames={workout.exercises.map((ex) => ex.name)}
      />
    </div>
  );
}
