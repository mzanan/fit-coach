"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { addSet } from "@/lib/actions/workouts";
import { cn } from "@/lib/utils";
import { useAction } from "@/hooks/useAction";

export function AddSetForm({ exerciseId }: { exerciseId: string }) {
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [perSide, setPerSide] = useState(false);
  const { pending, run } = useAction();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(
      () =>
        addSet({
          exerciseId,
          reps: reps === "" ? null : Number(reps),
          weight: weight === "" ? null : Number(weight),
          per_side: perSide,
        }),
      {
        onDone: () => {
          setReps("");
          setWeight("");
        },
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        placeholder="reps"
        className="h-9 w-16 text-center"
      />
      <span className="text-muted-foreground">x</span>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        placeholder="kg"
        className="h-9 w-20 text-center"
      />
      <button
        type="button"
        onClick={() => setPerSide((v) => !v)}
        className={cn(
          "h-9 shrink-0 rounded-lg border px-2 text-xs font-medium transition",
          perSide
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground",
        )}
      >
        per side
      </button>
      <Button type="submit" size="sm" disabled={pending}>
        Add
      </Button>
    </form>
  );
}
