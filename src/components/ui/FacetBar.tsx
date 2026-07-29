"use client";

import { ToggleChip } from "@/components/ui/ToggleChip";
import { cn } from "@/lib/utils";

export interface FacetOption {
  value: string;
  label: string;
}

export interface FacetGroup {
  key: string;
  label: string;
  options: FacetOption[];
}

export function FacetBar({
  groups,
  value,
  onChange,
  onReset,
  "aria-label": ariaLabel,
  className,
}: {
  groups: FacetGroup[];
  value: Record<string, string | null>;
  onChange: (groupKey: string, next: string | null) => void;
  onReset: () => void;
  "aria-label": string;
  className?: string;
}) {
  const clean = groups.every((g) => !value[g.key]);

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "fade-r flex w-full gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <ToggleChip
        size="md"
        tone="brand"
        pressedState={clean}
        onPressedChange={onReset}
        className="shrink-0"
      >
        All
      </ToggleChip>

      {groups.map((group) => (
        <div key={group.key} className="flex shrink-0 gap-2">
          <span className="eyebrow shrink-0 self-center pr-0.5 pl-1">{group.label}</span>
          {group.options.map((option) => (
            <ToggleChip
              key={option.value}
              size="md"
              tone="brand"
              pressedState={value[group.key] === option.value}
              onPressedChange={(next) => onChange(group.key, next ? option.value : null)}
              className="shrink-0"
            >
              {option.label}
            </ToggleChip>
          ))}
        </div>
      ))}
    </div>
  );
}
