"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption {
  value: string;
  label: string;
}

const SIZE = {
  md: "min-h-9",
  lg: "min-h-11",
} as const;

export function Segmented({
  options,
  value,
  onChange,
  size = "lg",
  ariaLabel,
  markerValue,
  className,
}: {
  options: readonly SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  size?: keyof typeof SIZE;
  ariaLabel?: string;
  markerValue?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex gap-1 rounded-full bg-muted p-1", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative flex-1 rounded-full px-3 py-1.5 text-meta font-medium transition-[background-color,color,box-shadow] duration-(--dur-fast) ease-(--ease-out-soft)",
            SIZE[size],
            value === o.value
              ? "bg-segment-active text-foreground shadow-card"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
          {markerValue === o.value ? (
            <span
              aria-hidden
              className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand"
            />
          ) : null}
        </button>
      ))}
    </div>
  );
}
