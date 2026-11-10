"use client";

import { MacroChips } from "@/components/ui/MacroChips";
import { Pill } from "@/components/ui/Pill";
import { kcalOf } from "@/lib/macros";
import type { PickerItem } from "@/components/today/useAddMeal";

export function MealPickerRow({
  item,
  disabled,
  adding,
  onPick,
}: {
  item: PickerItem;
  disabled: boolean;
  adding: boolean;
  onPick: (item: PickerItem) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={adding}
      aria-label={`Add ${item.name}, ${Math.round(kcalOf(item))} kcal`}
      onClick={() => onPick(item)}
      className="flex min-h-14 w-full items-center gap-3 px-card py-2.5 text-left transition-colors duration-(--dur-fast) ease-(--ease-out-soft) active:bg-overlay focus-visible:bg-overlay focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-body font-medium">
            {item.name}
            {item.place ? (
              <span className="text-muted-foreground"> · {item.place}</span>
            ) : null}
          </span>
          {item.fat_quality === "oily" ? (
            <Pill tone="brand" className="shrink-0">
              Oily
            </Pill>
          ) : null}
        </div>
        {adding ? (
          <p className="mt-1 text-meta text-muted-foreground">Adding...</p>
        ) : (
          <MacroChips macros={item} className="mt-1" />
        )}
      </div>
    </button>
  );
}
