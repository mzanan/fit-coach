"use client";

import { Check, ChevronDown } from "lucide-react";

import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from "@/components/ui/Menu";
import { REASONING_EFFORTS, type ReasoningEffort } from "@/lib/ai/options";

const LABEL: Record<ReasoningEffort, string> = {
  none: "Off",
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function EffortMenu({
  effort,
  disabled,
  onChange,
}: {
  effort: ReasoningEffort;
  disabled: boolean;
  onChange: (effort: ReasoningEffort) => void;
}) {
  return (
    <MenuRoot>
      <MenuTrigger
        disabled={disabled}
        className="flex min-h-11 shrink-0 items-center gap-1 rounded-control px-2.5 text-meta text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:text-foreground focus-visible:border-ring disabled:opacity-50"
      >
        Effort
        <span className="text-foreground">{LABEL[effort]}</span>
        <ChevronDown className="size-3.5" strokeWidth={1.5} />
      </MenuTrigger>
      <MenuContent align="start" side="top">
        {REASONING_EFFORTS.map((value) => (
          <MenuItem
            key={value}
            onSelect={() => onChange(value)}
            className="justify-between"
          >
            {LABEL[value]}
            {value === effort ? (
              <Check className="size-4" strokeWidth={1.5} />
            ) : null}
          </MenuItem>
        ))}
      </MenuContent>
    </MenuRoot>
  );
}
