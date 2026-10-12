"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import type { RoutineExercise } from "@/lib/db/schema";
import { routineExerciseSummary } from "@/lib/routineSummary";

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
    <Surface radius="lg" pad="none" className="flex items-center gap-1 px-2 py-1.5">
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 rounded-control-inset px-2 py-2 text-left"
      >
        <p className="truncate text-body">{exercise.name}</p>
        <p className="text-meta text-muted-foreground">
          {routineExerciseSummary(exercise)}
        </p>
        {exercise.notes ? (
          <p className="break-words text-meta text-muted-foreground">{exercise.notes}</p>
        ) : null}
      </button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Move ${exercise.name} up`}
        disabled={isFirst}
        onClick={() => onMove(-1)}
      >
        <ChevronUp className="size-[18px]" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Move ${exercise.name} down`}
        disabled={isLast}
        onClick={() => onMove(1)}
      >
        <ChevronDown className="size-[18px]" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${exercise.name}`}
        onClick={onDelete}
      >
        <Trash2 className="size-[18px]" />
      </Button>
    </Surface>
  );
}
