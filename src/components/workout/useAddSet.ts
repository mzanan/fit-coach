"use client";

import { useEffect, useRef, useState } from "react";

import { addSet } from "@/lib/actions/workouts";
import type { WorkoutSet } from "@/lib/db/schema";
import { prefillFrom } from "@/lib/setPrefill";
import type { HistorySet } from "@/lib/workoutHistory";
import { useAction } from "@/hooks/useAction";

export function useAddSet({
  exerciseId,
  lastCurrentSet,
  lastSessionTop,
}: {
  exerciseId: string;
  lastCurrentSet: WorkoutSet | null;
  lastSessionTop: HistorySet | null;
}) {
  const [initial] = useState(() => prefillFrom(lastCurrentSet, lastSessionTop));
  const [reps, setReps] = useState(initial.reps);
  const [weight, setWeight] = useState(initial.weight);
  const [perSide, setPerSide] = useState(initial.perSide);
  const { pending, run } = useAction();

  const latest = useRef({ lastCurrentSet, lastSessionTop });
  useEffect(() => {
    latest.current = { lastCurrentSet, lastSessionTop };
  });
  const lastCurrentSetId = lastCurrentSet?.id ?? null;

  useEffect(() => {
    if (!lastCurrentSetId) return;
    const filled = prefillFrom(latest.current.lastCurrentSet, latest.current.lastSessionTop);
    setReps(filled.reps);
    setWeight(filled.weight);
    setPerSide(filled.perSide);
  }, [lastCurrentSetId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reps.trim() === "" && weight.trim() === "") return;
    run(() =>
      addSet({
        exerciseId,
        reps: reps === "" ? null : Number(reps),
        weight: weight === "" ? null : Number(weight),
        per_side: perSide,
      }),
    );
  }

  return { reps, setReps, weight, setWeight, perSide, setPerSide, pending, submit };
}
