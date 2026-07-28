"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { deleteSet, toggleSetPr } from "@/lib/actions/workouts";
import type { WorkoutSet } from "@/lib/db/schema";
import { useAction } from "@/hooks/useAction";

export function SetRow({ set }: { set: WorkoutSet }) {
  const { pending, run } = useAction();

  const weight =
    set.weight == null ? "BW" : `${set.weight} kg${set.per_side ? "/side" : ""}`;

  return (
    <div className="flex min-h-11 items-center gap-2">
      <span className="num w-7 shrink-0 text-meta text-faint">#{set.set_index}</span>
      <span className="num min-w-0 flex-1 text-body">
        {set.reps ?? "-"} x {weight}
      </span>
      <ToggleChip
        size="md"
        tone="brand"
        pressedState={set.is_pr}
        onPressedChange={() => run(() => toggleSetPr(set.id))}
        disabled={pending}
        aria-label={`Mark set ${set.set_index} as personal record`}
      >
        PR
      </ToggleChip>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete set ${set.set_index}`}
        disabled={pending}
        onClick={() => run(() => deleteSet(set.id))}
      >
        <X className="size-[18px] text-muted-foreground" strokeWidth={1.5} />
      </Button>
    </div>
  );
}
