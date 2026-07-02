"use client";

import { Surface } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { ensureWorkout } from "@/lib/actions/workouts";
import { DEFAULT_SPLIT } from "@/lib/constants";
import { useAction } from "@/hooks/useAction";

export function StartWorkout({ day }: { day: string }) {
  const { pending, run } = useAction();

  function start(label?: string) {
    run(() => ensureWorkout({ day, label }), { success: "Workout started" });
  }

  return (
    <Surface className="space-y-3 p-4">
      <p className="text-sm text-muted-foreground">
        No session today. Pick a split to start.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {DEFAULT_SPLIT.map((label) => (
          <Button
            key={label}
            variant="outline"
            disabled={pending}
            onClick={() => start(label)}
          >
            {label}
          </Button>
        ))}
      </div>
      <Button
        variant="ghost"
        className="w-full"
        disabled={pending}
        onClick={() => start(undefined)}
      >
        Empty session
      </Button>
    </Surface>
  );
}
