"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Surface } from "@/components/ui/Surface";
import { ToggleChip } from "@/components/ui/ToggleChip";
import type { ExerciseCatalogOption } from "@/lib/data/exerciseCatalog";
import { useAddExercise } from "@/components/workout/useAddExercise";

export function AddExercise({
  workoutId,
  names,
  existingNames,
  catalogOptions,
}: {
  workoutId: string;
  names: string[];
  existingNames: string[];
  catalogOptions: ExerciseCatalogOption[];
}) {
  const { name, setName, pending, suggestions, add, submit } = useAddExercise({
    workoutId,
    names,
    existingNames,
    catalogOptions,
  });

  return (
    <Surface level="sunken" radius="xl" className="p-3">
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Exercise name"
          enterKeyHint="done"
          autoCapitalize="words"
          aria-label="Exercise name"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Add exercise"
          disabled={pending || !name.trim()}
        >
          <Plus className="size-5" />
        </Button>
      </form>

      {suggestions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s, i) => (
            <ToggleChip
              key={s.catalogId ?? s.name}
              tone="neutral"
              pressedState={false}
              onPressedChange={() => add(s)}
              disabled={pending}
              className={i >= 6 ? "hidden md:inline-flex" : ""}
            >
              {s.name}
            </ToggleChip>
          ))}
        </div>
      ) : null}
    </Surface>
  );
}
