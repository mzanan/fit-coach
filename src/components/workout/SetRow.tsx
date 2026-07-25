"use client";

import { Star, X } from "lucide-react";

import { Pill } from "@/components/ui/Pill";
import { deleteSet, toggleSetPr } from "@/lib/actions/workouts";
import type { WorkoutSet } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { useAction } from "@/hooks/useAction";

export function SetRow({ set }: { set: WorkoutSet }) {
  const { pending, run } = useAction();

  const weight =
    set.weight == null
      ? "BW"
      : `${set.weight}kg${set.per_side ? "/side" : ""}`;

  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className="w-6 text-xs text-muted-foreground">#{set.set_index}</span>
      <span className="flex-1 tabular-nums">
        {set.reps ?? "-"} x {weight}
      </span>
      {set.is_pr ? <Pill tone="brand">PR</Pill> : null}
      <button
        type="button"
        aria-label="Toggle PR"
        disabled={pending}
        className={cn(
          "rounded-md p-1 transition",
          set.is_pr ? "text-primary" : "text-muted-foreground hover:bg-accent",
        )}
        onClick={() => run(() => toggleSetPr(set.id))}
      >
        <Star className="size-4" fill={set.is_pr ? "currentColor" : "none"} />
      </button>
      <button
        type="button"
        aria-label="Delete set"
        disabled={pending}
        className="rounded-md p-1 text-muted-foreground hover:bg-accent"
        onClick={() => run(() => deleteSet(set.id))}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
