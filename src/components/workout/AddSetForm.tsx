"use client";

import { BigNumberField } from "@/components/ui/BigNumberField";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { Surface } from "@/components/ui/Surface";
import type { WorkoutSet } from "@/lib/db/schema";
import type { HistorySet } from "@/lib/workoutHistory";
import { useAddSet } from "@/components/workout/useAddSet";

export function AddSetForm({
  exerciseId,
  setCount,
  lastCurrentSet,
  lastSessionTop,
}: {
  exerciseId: string;
  setCount: number;
  lastCurrentSet: WorkoutSet | null;
  lastSessionTop: HistorySet | null;
}) {
  const { reps, setReps, weight, setWeight, perSide, setPerSide, pending, submit } =
    useAddSet({ exerciseId, lastCurrentSet, lastSessionTop });

  return (
    <Surface level="sunken" radius="lg" className="flex h-full flex-col p-3">
      <span className="eyebrow">SET {setCount + 1}</span>
      <form onSubmit={submit} className="mt-2 flex flex-1 flex-col justify-between">
        <div className="flex gap-2">
          <BigNumberField
            id={`${exerciseId}-reps`}
            label="REPS"
            inputMode="numeric"
            value={reps}
            onChange={setReps}
            placeholder="0"
          />
          <BigNumberField
            id={`${exerciseId}-kg`}
            label="KG"
            inputMode="decimal"
            step={0.5}
            value={weight}
            onChange={setWeight}
            placeholder="BW"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <ToggleChip
            tone="neutral"
            pressedState={perSide}
            onPressedChange={setPerSide}
            className="shrink-0"
          >
            Per side
          </ToggleChip>
          <Button
            type="submit"
            variant="solid"
            size="md"
            className="flex-1"
            disabled={pending || (reps.trim() === "" && weight.trim() === "")}
          >
            Add set
          </Button>
        </div>
      </form>
    </Surface>
  );
}
