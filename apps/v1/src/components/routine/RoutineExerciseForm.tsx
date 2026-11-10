"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { NumberField } from "@/components/ui/NumberField";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { useExerciseSearch } from "@/components/workout/useExerciseSearch";
import type { RoutineExercise } from "@/lib/db/schema";
import type { RoutineExerciseSaveValues } from "@/components/routine/useRoutineExercises";

export function RoutineExerciseForm({
  initial,
  pending,
  onSubmit,
}: {
  initial: RoutineExercise | null;
  pending: boolean;
  onSubmit: (values: RoutineExerciseSaveValues) => void;
}) {
  const search = useExerciseSearch(true, initial?.name ?? "");
  const [catalogId, setCatalogId] = useState<string | null>(
    initial?.exercise_catalog_id ?? null,
  );
  const [targetSets, setTargetSets] = useState(String(initial?.target_sets ?? 3));
  const [targetReps, setTargetReps] = useState(String(initial?.target_reps ?? 8));
  const [currentWeight, setCurrentWeight] = useState(
    initial?.current_weight != null ? String(initial.current_weight) : "",
  );
  const [perSide, setPerSide] = useState(initial?.per_side ?? false);
  const [incrementKg, setIncrementKg] = useState(String(initial?.increment_kg ?? 2.5));

  function pick(name: string, id: string) {
    search.setQuery(name);
    setCatalogId(id);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = search.query.trim();
    if (!name) return;
    onSubmit({
      id: initial?.id,
      name,
      exercise_catalog_id: catalogId,
      target_sets: Number(targetSets) || 1,
      target_reps: Number(targetReps) || 1,
      current_weight: currentWeight.trim() === "" ? null : Number(currentWeight),
      per_side: perSide,
      increment_kg: Number(incrementKg) || 2.5,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="routine-ex-name">Exercise name</Label>
        <Input
          id="routine-ex-name"
          value={search.query}
          onChange={(e) => {
            search.setQuery(e.target.value);
            setCatalogId(null);
          }}
          placeholder="Search or type a name"
        />
        {search.query.trim() !== "" && catalogId === null && search.items.length > 0 ? (
          <ul className="mt-1.5 divide-y divide-border rounded-control border border-hairline-strong">
            {search.items.slice(0, 6).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => pick(item.name, item.id)}
                  className="flex min-h-11 w-full items-center px-3 text-left text-meta"
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          id="routine-ex-sets"
          label="Target sets"
          value={targetSets}
          onChange={setTargetSets}
          min={1}
        />
        <NumberField
          id="routine-ex-reps"
          label="Target reps"
          value={targetReps}
          onChange={setTargetReps}
          min={1}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          id="routine-ex-weight"
          label="Current weight (kg)"
          value={currentWeight}
          onChange={setCurrentWeight}
          min={0}
          step={0.5}
          placeholder="BW"
        />
        <NumberField
          id="routine-ex-increment"
          label="Increment (kg)"
          value={incrementKg}
          onChange={setIncrementKg}
          min={0.25}
          step={0.25}
        />
      </div>

      <ToggleChip pressedState={perSide} onPressedChange={setPerSide}>
        Per side
      </ToggleChip>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving..." : initial ? "Save changes" : "Add exercise"}
      </Button>
    </form>
  );
}
