"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MediaTile } from "@/components/ui/MediaTile";
import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";
import type { ExerciseCatalogOption } from "@/lib/data/exerciseCatalog";
import { useAddExercise } from "@/components/workout/useAddExercise";
import { exerciseGifUrl } from "@/lib/exercises";

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
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="md" className="w-full" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add exercise
      </Button>

      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Add exercise">
        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exercise name"
            enterKeyHint="done"
            autoCapitalize="words"
            autoFocus
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
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {suggestions.map((s, i) => (
              <MediaTile
                key={s.catalogId ?? s.name}
                index={i}
                title={s.name}
                meta={s.meta}
                disabled={pending}
                onSelect={() => add(s)}
                media={
                  s.gifPath ? (
                    <Image
                      src={exerciseGifUrl(s.gifPath)}
                      alt=""
                      width={240}
                      height={180}
                      unoptimized
                      className="size-full object-cover"
                    />
                  ) : undefined
                }
              />
            ))}
          </div>
        ) : null}
      </ResponsiveDialog>
    </>
  );
}
