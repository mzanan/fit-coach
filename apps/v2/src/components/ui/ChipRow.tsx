"use client";

import { useEffect, useRef } from "react";

import { ToggleChip } from "@/components/ui/ToggleChip";
import { cn } from "@/lib/utils";

export function ChipRow({
  options,
  value,
  onChange,
  ariaLabel,
  tone = "brand",
  className,
}: {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  tone?: "brand" | "neutral";
  className?: string;
}) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "auto",
    });
  }, []);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex snap-x gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible",
        className,
      )}
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <ToggleChip
            key={o.value}
            ref={selected ? selectedRef : undefined}
            size="md"
            tone={tone}
            pressedState={selected}
            onPressedChange={() => onChange(o.value)}
            className="shrink-0 snap-start"
          >
            {o.label}
          </ToggleChip>
        );
      })}
    </div>
  );
}
