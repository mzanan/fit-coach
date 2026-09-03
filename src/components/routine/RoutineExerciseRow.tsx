"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import type { RoutineExercise } from "@/lib/db/schema";

function summaryOf(exercise: RoutineExercise): string {
  const weight =
    exercise.current_weight == null ? "BW" : `${exercise.current_weight} kg`;
  const side = exercise.per_side ? "/side" : "";
  return `${exercise.target_sets} x ${exercise.target_reps} · ${weight}${side} · +${exercise.increment_kg}kg`;
}

export function RoutineExerciseRow({
  exercise,
  isFirst,
  isLast,
  onEdit,
  onMove,
  onDelete,
}: {
  exercise: RoutineExercise;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <Surface radius="lg" className="flex items-center gap-1 px-2 py-1.5">
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 rounded-control-inset px-2 py-2 text-left"
      >
        <p className="truncate text-body">{exercise.name}</p>
        <p className="truncate text-meta text-muted-foreground">
          {summaryOf(exercise)}
        </p>
      </button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Move ${exercise.name} up`}
        disabled={isFirst}
        onClick={() => onMove(-1)}
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Move ${exercise.name} down`}
        disabled={isLast}
        onClick={() => onMove(1)}
      >
        <ChevronDown className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${exercise.name}`}
        onClick={onDelete}
      >
        <Trash2 className="size-4" />
      </Button>
    </Surface>
  );
}
