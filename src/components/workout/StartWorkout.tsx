"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ensureWorkout } from "@/lib/actions/workouts";
import { DEFAULT_SPLIT } from "@/lib/constants";
import { useAction } from "@/hooks/useAction";

export function StartWorkout({
  day,
  lastLabel,
  suggestedSplit,
}: {
  day: string;
  lastLabel: string | null;
  suggestedSplit: string;
}) {
  const { pending, run } = useAction();

  function start(label?: string) {
    run(() => ensureWorkout({ day, label }), { success: "Workout started" });
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
