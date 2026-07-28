"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Surface } from "@/components/ui/Surface";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { addExercise } from "@/lib/actions/workouts";
import { normalizeSearch } from "@/lib/search";
import { useAction } from "@/hooks/useAction";

export function AddExercise({
  workoutId,
  names,
  existingNames,
}: {
  workoutId: string;
  names: string[];
  existingNames: string[];
}) {
  const [name, setName] = useState("");
  const { pending, run } = useAction();

  const suggestions = useMemo(() => {
    const existing = new Set(existingNames.map(normalizeSearch));
    const available = names.filter((n) => !existing.has(normalizeSearch(n)));
    const q = normalizeSearch(name);
    if (q === "") return available.slice(0, 10);
    const starts = available.filter((n) => normalizeSearch(n).startsWith(q));
    const contains = available.filter(
      (n) => !normalizeSearch(n).startsWith(q) && normalizeSearch(n).includes(q),
    );
    return [...starts, ...contains].slice(0, 10);
  }, [name, names, existingNames]);

  function add(exerciseName: string) {
    if (!exerciseName.trim() || pending) return;
    run(() => addExercise({ workoutId, name: exerciseName }), {
      onDone: () => setName(""),
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    add(name);
  }

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
          {suggestions.map((n, i) => (
            <ToggleChip
              key={n}
              tone="neutral"
              pressedState={false}
              onPressedChange={() => add(n)}
              disabled={pending}
              className={i >= 6 ? "hidden md:inline-flex" : ""}
            >
              {n}
            </ToggleChip>
          ))}
        </div>
      ) : null}
    </Surface>
  );
}
