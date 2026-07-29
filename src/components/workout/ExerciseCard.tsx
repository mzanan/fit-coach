"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { AddSetForm } from "@/components/workout/AddSetForm";
import { ExerciseGif } from "@/components/workout/ExerciseGif";
import { SetRow } from "@/components/workout/SetRow";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";
import { Surface } from "@/components/ui/Surface";
import { deleteExercise } from "@/lib/actions/workouts";
import type { ExerciseFull, WorkoutHistory } from "@/lib/data/workouts";
import { formatDayLabel } from "@/lib/dates";
import { normalizeSearch } from "@/lib/search";
import { beatsLast, formatSet, formatSetLine, topSet } from "@/lib/workoutHistory";
import { useAction } from "@/hooks/useAction";
import { cn } from "@/lib/utils";

export function ExerciseCard({
  exercise,
  day,
  history,
  historyAvailable,
  index,
}: {
  exercise: ExerciseFull;
  day: string;
  history: WorkoutHistory;
  historyAvailable: boolean;
  index: number;
}) {
  const { pending, run } = useAction();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const last = history.lastByName[normalizeSearch(exercise.name)] ?? null;

  const currentSets = exercise.sets.map((s) => ({
    reps: s.reps,
    weight: s.weight,
    per_side: s.per_side,
  }));
  const comparableSets = last
    ? currentSets.filter((s) => s.per_side === last.top?.per_side)
    : currentSets;
  const bestCurrent = topSet(comparableSets);
  const delta = last ? beatsLast(bestCurrent, last.top) : null;

  return (
    <Surface
      level="flat"
      radius="xl"
      className="animate-in fade-in slide-in-from-bottom-1 fill-mode-backwards px-card py-4 duration-(--dur-base) ease-(--ease-out-soft) md:p-5"
      style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-title font-medium tracking-(--tracking-snug)">
            {exercise.name}
          </p>
          {exercise.meta ? (
            <p className="mt-0.5 truncate text-meta text-muted-foreground">{exercise.meta}</p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete ${exercise.name}`}
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-[18px]" strokeWidth={1.5} />
        </Button>
      </div>

      {exercise.gif_path ? (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <ExerciseGif name={exercise.name} gifPath={exercise.gif_path} priority={index === 0} />
          <div className="min-w-0 sm:flex-1">
            <AddSetForm
              exerciseId={exercise.id}
              setCount={exercise.sets.length}
              lastCurrentSet={exercise.sets[exercise.sets.length - 1] ?? null}
              lastSessionTop={last?.top ?? null}
            />
          </div>
        </div>
      ) : null}

      {historyAvailable ? (
        last ? (
          <button
            type="button"
            aria-label={`Last session for ${exercise.name}, ${formatDayLabel(last.day, day)}`}
            onClick={() => setSheetOpen(true)}
            className="mt-2.5 flex min-h-11 w-full items-center gap-2 rounded-control bg-well px-3 py-2 text-left"
          >
            <span className="eyebrow shrink-0 text-brand-ink">LAST</span>
            <span className="num min-w-0 flex-1 truncate text-meta text-foreground">
              {formatSetLine(last.sets)}
            </span>
            <span className="shrink-0 text-meta text-muted-foreground">
              {formatDayLabel(last.day, day)}
            </span>
          </button>
        ) : (
          <div className="mt-2.5 flex min-h-11 items-center rounded-control bg-well px-3 py-2">
            <span className="text-meta text-muted-foreground">No previous session</span>
          </div>
        )
      ) : null}

      {exercise.sets.length > 0 ? (
        <div className="mt-3 divide-y divide-border">
          {exercise.sets.map((s) => (
            <SetRow key={s.id} set={s} />
          ))}
        </div>
      ) : (
        <p className="py-2 text-meta text-muted-foreground">No sets yet</p>
      )}

      {delta != null && delta >= 0 ? (
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "mt-2.5 animate-in fade-in text-meta duration-(--dur-slow)",
            delta === 0 ? "text-muted-foreground" : "text-brand-ink",
          )}
        >
          {delta === 0
            ? "Matching last session"
            : `Ahead of last session by ${Math.abs(delta)} ${
                bestCurrent?.weight == null ? "reps" : "kg"
              }`}
        </p>
      ) : null}

      {exercise.gif_path ? null : (
        <div className="mt-3">
          <AddSetForm
            exerciseId={exercise.id}
            setCount={exercise.sets.length}
            lastCurrentSet={exercise.sets[exercise.sets.length - 1] ?? null}
            lastSessionTop={last?.top ?? null}
          />
        </div>
      )}

      {last ? (
        <ResponsiveDialog
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="Last session"
          description={`${exercise.name} · ${formatDayLabel(last.day, day)}`}
        >
          <div className="divide-y divide-border">
            {last.sets.map((s, i) => (
              <div key={i} className="num flex min-h-11 items-center text-body">
                #{i + 1} {formatSet(s)}
              </div>
            ))}
          </div>
          <p className="mt-2 text-meta text-muted-foreground">
            Top set: {formatSet(last.top)}
          </p>
        </ResponsiveDialog>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this exercise?"
        body="Its sets from today are removed. Past sessions are untouched."
        confirmLabel="Delete"
        tone="danger"
        pending={pending}
        onConfirm={() => run(() => deleteExercise(exercise.id))}
      />
    </Surface>
  );
}
