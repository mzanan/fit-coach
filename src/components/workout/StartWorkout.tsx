"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { Surface } from "@/components/ui/Surface";
import { startFromRoutine } from "@/lib/actions/routine";
import { ensureWorkout } from "@/lib/actions/workouts";
import { DEFAULT_SPLIT } from "@/lib/constants";
import type { TodaysRoutine } from "@/lib/data/routine";
import { useAction } from "@/hooks/useAction";

export function StartWorkout({
  day,
  lastLabel,
  suggestedSplit,
  routine,
}: {
  day: string;
  lastLabel: string | null;
  suggestedSplit: string;
  routine: TodaysRoutine | null;
}) {
  const { pending, run } = useAction();

  function start(label?: string) {
    run(() => ensureWorkout({ day, label }), { success: "Workout started" });
  }

  function startRoutine() {
    run(() => startFromRoutine({ day }), { success: "Workout started" });
  }

  const hasRoutine = Boolean(routine?.label && routine.exercises.length > 0);

  if (hasRoutine && routine) {
    return (
      <div className="space-y-tight">
        <Surface radius="xl" className="divide-y divide-border overflow-hidden">
          <div className="px-card py-3">
            <p className="text-body font-medium">{routine.label}</p>
            <p className="text-meta text-muted-foreground">
              {"Today's prescribed routine"}
            </p>
          </div>
          {routine.exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="flex items-center gap-3 px-card py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-body">{exercise.name}</p>
                <p className="text-meta text-muted-foreground">
                  {exercise.target_sets} x {exercise.target_reps}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="num text-body">
                  {exercise.prescribed_weight == null
                    ? "BW"
                    : `${exercise.prescribed_weight} kg`}
                </span>
                {exercise.raise ? (
                  <Pill tone="brand" variant="solid">
                    Raise
                  </Pill>
                ) : null}
              </div>
            </div>
          ))}
        </Surface>

        <Button
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={startRoutine}
        >
          {"Start today's routine"}
        </Button>

        <div>
          <p className="eyebrow px-1 pb-2">Or start a different session</p>
          <div className="grid grid-cols-2 gap-2">
            {DEFAULT_SPLIT.map((label) => (
              <Button
                key={label}
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => start(label)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <EmptyState
      title="No session logged today"
      body={
        lastLabel
          ? `Last session was ${lastLabel}. ${suggestedSplit} is next.`
          : "Pick a split to start. You can rename it later."
      }
      action={
        <div>
          <div className="grid grid-cols-2 gap-2">
            {DEFAULT_SPLIT.map((label) => (
              <Button
                key={label}
                size="lg"
                variant={label === suggestedSplit ? "solid" : "outline"}
                disabled={pending}
                onClick={() => start(label)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="lg"
            className="mt-2 w-full"
            disabled={pending}
            onClick={() => start(undefined)}
          >
            Empty session
          </Button>
        </div>
      }
    />
  );
}
