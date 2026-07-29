"use client";

import { Check, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { MediaPlate } from "@/components/ui/MediaPlate";
import type { ExerciseCatalogOption } from "@/lib/data/exerciseCatalog";
import { exerciseGifUrl, formatExerciseMeta } from "@/lib/exercises";

export function ExerciseResultRow({
  exercise,
  index,
  added,
  adding,
  onAdd,
}: {
  exercise: ExerciseCatalogOption;
  index: number;
  added: boolean;
  adding: boolean;
  onAdd: () => void;
}) {
  const meta = formatExerciseMeta(exercise.equipment, exercise.target);

  return (
    <li
      className="animate-in fade-in slide-in-from-bottom-1 fill-mode-backwards flex items-center gap-3 py-3"
      style={{
        animationDelay: `${Math.min(index, 7) * 40}ms`,
        animationDuration: "var(--dur-base)",
      }}
    >
      <MediaPlate
        src={exerciseGifUrl(exercise.gif_path)}
        alt={`${exercise.name} demo`}
        size="sm"
        priority={index < 4}
      />

      <div className="min-w-0 flex-1">
        <p className="text-pretty text-body tracking-(--tracking-snug) text-foreground first-letter:uppercase">
          {exercise.name}
        </p>
        {added ? (
          <p className="mt-0.5 truncate text-meta text-brand-ink">Added to this workout</p>
        ) : meta ? (
          <p className="mt-0.5 truncate text-meta text-muted-foreground capitalize">{meta}</p>
        ) : null}
      </div>

      {added ? (
        <span
          aria-hidden
          className="animate-in fade-in zoom-in-90 flex size-11 shrink-0 items-center justify-center duration-(--dur-fast) ease-(--ease-out-soft)"
        >
          <Check className="size-5 text-brand-ink" />
        </span>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Add ${exercise.name}`}
          aria-busy={adding}
          disabled={adding}
          onClick={onAdd}
          className="shrink-0"
        >
          {adding ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <Plus className="size-5" />
          )}
        </Button>
      )}
    </li>
  );
}
