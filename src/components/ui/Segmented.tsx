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
  size = "md",
  ariaLabel,
  className,
}: {
  options: readonly SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  size?: keyof typeof SIZE;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex gap-1 rounded-control bg-muted p-1", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-control-inset px-2 py-1.5 text-meta font-medium transition-[background-color,color,box-shadow] duration-(--dur-fast) ease-(--ease-out-soft)",
            SIZE[size],
            value === o.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
