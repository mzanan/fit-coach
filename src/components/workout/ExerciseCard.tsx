"use client";

import { Trash2 } from "lucide-react";

import { AddSetForm } from "@/components/workout/AddSetForm";
import { SetRow } from "@/components/workout/SetRow";
import { Surface } from "@/components/ui/Surface";
import { deleteExercise } from "@/lib/actions/workouts";
import type { ExerciseFull } from "@/lib/data/workouts";
import { useAction } from "@/hooks/useAction";

export function ExerciseCard({ exercise }: { exercise: ExerciseFull }) {
  const { pending, run } = useAction();

  return (
    <Surface className="p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">{exercise.name}</span>
        <button
          type="button"
          aria-label="Delete exercise"
          disabled={pending}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          onClick={() => {
            if (!confirm("Delete this exercise?")) return;
            run(() => deleteExercise(exercise.id));
          }}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {exercise.sets.length > 0 ? (
        <div className="mt-1 divide-y divide-border">
          {exercise.sets.map((s) => (
            <SetRow key={s.id} set={s} />
          ))}
        </div>
      ) : null}

      <div className="mt-3">
        <AddSetForm exerciseId={exercise.id} />
      </div>
    </Surface>
  );
}
