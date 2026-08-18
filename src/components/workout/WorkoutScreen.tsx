import { AddExercise } from "@/components/workout/AddExercise";
import { ExerciseCard } from "@/components/workout/ExerciseCard";
import { StartWorkout } from "@/components/workout/StartWorkout";
import { EmptyState } from "@/components/ui/EmptyState";
import type { WorkoutFull, WorkoutHistory } from "@/lib/data/workouts";
import { EXERCISE_MEDIA_ATTRIBUTION } from "@/lib/exercises";

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
      <StartWorkout
        day={day}
        lastLabel={history.lastLabel}
        suggestedSplit={suggestedSplit}
      />
    );
  }

  return (
    <div className="space-y-tight">
      <AddExercise
        workoutId={workout.id}
        existingNames={workout.exercises.map((ex) => ex.name)}
      />

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

      {workout.exercises.some((ex) => ex.gif_path) ? (
        <p className="mt-block text-center text-eyebrow text-muted-foreground">
          {EXERCISE_MEDIA_ATTRIBUTION}
        </p>
      ) : null}
    </div>
  );
}
