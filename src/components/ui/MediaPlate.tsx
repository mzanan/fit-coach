"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

const SIZE = {
  sm: "size-(--spacing-media-sm) sm:size-(--spacing-media-md)",
  hero: "size-(--spacing-media-hero)",
  card: "h-(--spacing-media-hero) w-full sm:size-(--spacing-media-hero)",
} as const;

export function MediaPlate({
  src,
  alt,
  priority,
  size = "sm",
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-hairline-strong bg-media-canvas p-1",
        SIZE[size],
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={180}
        height={180}
        unoptimized
        priority={priority}
        onError={() => setBroken(true)}
        className="animate-in fade-in size-full object-contain duration-(--dur-base) ease-(--ease-out-soft)"
      />
    </div>
  );
}
