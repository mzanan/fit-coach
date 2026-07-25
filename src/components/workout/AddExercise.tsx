"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { addExercise } from "@/lib/actions/workouts";
import { useAction } from "@/hooks/useAction";

export function AddExercise({ workoutId }: { workoutId: string }) {
  const [name, setName] = useState("");
  const { pending, run } = useAction();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    run(() => addExercise({ workoutId, name }), {
      onDone: () => setName(""),
    });
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add exercise"
      />
      <Button type="submit" size="icon" aria-label="Add exercise" disabled={pending}>
        <Plus className="size-5" />
      </Button>
    </form>
  );
}
