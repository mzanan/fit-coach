"use client";

import Image from "next/image";
import { useState } from "react";

import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";
import { EXERCISE_MEDIA_ATTRIBUTION, exerciseGifUrl } from "@/lib/exercises";

export function ExerciseGif({ name, gifPath }: { name: string; gifPath: string }) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const url = exerciseGifUrl(gifPath);

  if (broken) return null;

  return (
    <>
      <button
        type="button"
        aria-label={`Show ${name} demo`}
        onClick={() => setOpen(true)}
        className="size-11 shrink-0 overflow-hidden rounded-md bg-well"
      >
        <Image
          src={url}
          alt=""
          width={180}
          height={180}
          unoptimized
          onError={() => setBroken(true)}
          className="size-full object-cover"
        />
      </button>

      <ResponsiveDialog open={open} onOpenChange={setOpen} title={name}>
        <Image
          src={url}
          alt={`${name} demo`}
          width={180}
          height={180}
          unoptimized
          className="mx-auto size-56 rounded-md"
        />
        <p className="mt-2 text-center text-meta text-muted-foreground">
          {EXERCISE_MEDIA_ATTRIBUTION}
        </p>
      </ResponsiveDialog>
    </>
  );
}
