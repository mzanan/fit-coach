"use client";

import { Plus } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MediaTile } from "@/components/ui/MediaTile";
import { Surface } from "@/components/ui/Surface";
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
        <div className="mt-3 grid max-h-[62svh] grid-cols-2 gap-2 overflow-y-auto overscroll-contain sm:grid-cols-3 lg:grid-cols-4">
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
    </Surface>
  );
}
