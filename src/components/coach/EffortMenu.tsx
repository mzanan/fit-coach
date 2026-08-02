"use client";

import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";

import { REASONING_EFFORTS, type ReasoningEffort } from "@/lib/ai/options";
import { cn } from "@/lib/utils";

const LABEL: Record<ReasoningEffort, string> = {
  none: "Off",
  low: "Low",
  medium: "Medium",
  high: "High",
};

const ITEM =
  "flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-control px-3 text-body outline-none transition-colors duration-(--dur-fast) focus-visible:bg-accent data-[highlighted]:bg-accent";

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
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={disabled}
        className="flex min-h-9 shrink-0 items-center gap-1 rounded-control px-2.5 text-meta text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:text-foreground focus-visible:border-ring disabled:opacity-50"
      >
        Effort
        <span className="text-foreground">{LABEL[effort]}</span>
        <ChevronDown className="size-3.5" strokeWidth={1.5} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          side="top"
          sideOffset={8}
          className="z-50 min-w-56 rounded-xl border border-border bg-popover p-1.5 shadow-raised"
        >
          {REASONING_EFFORTS.map((value) => (
            <DropdownMenu.Item
              key={value}
              onSelect={() => onChange(value)}
              className={cn(ITEM)}
            >
              {LABEL[value]}
              {value === effort ? (
                <Check className="size-4" strokeWidth={1.5} />
              ) : null}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
