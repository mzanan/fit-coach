"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ChipRow } from "@/components/ui/ChipRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { MacroChips } from "@/components/ui/MacroChips";
import { Pill } from "@/components/ui/Pill";
import { COMPONENT_GROUPS } from "@/lib/constants";
import type { CatalogItemFull } from "@/lib/data/catalog";
import { sumMacros } from "@/lib/macros";
import { cn } from "@/lib/utils";

export function BowlBuilder({
  items,
  pending,
  onAdd,
}: {
  items: CatalogItemFull[];
  pending: boolean;
  onAdd: (input: { itemId: string; componentIds: string[] }) => void;
}) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const item = items.find((i) => i.id === itemId);

  if (!item) {
    return (
      <EmptyState
        size="sm"
        title="No build-your-own meals yet"
        body="Mark a catalog item as build your own to use this."
      />
    );
  }

  const chosen = item.components.filter((c) => selected.has(c.id));
  const totals = sumMacros(chosen);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      {items.length > 1 ? (
        <ChipRow
          className="mb-3 -mx-5 px-5 sm:mx-0 sm:px-0"
          ariaLabel="Bowl"
          tone="neutral"
          options={items.map((i) => ({ value: i.id, label: i.name }))}
          value={itemId}
          onChange={(v) => {
            setItemId(v);
            setSelected(new Set());
          }}
        />
      ) : null}

      <div className="space-y-3">
        {COMPONENT_GROUPS.map((group) => {
          const comps = item.components.filter(
            (c) => c.group_name === group.key,
          );
          if (comps.length === 0) return null;
          return (
            <div key={group.key}>
              <p className="eyebrow mb-2">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {comps.map((c) => {
                  const on = selected.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      className={cn(
                        "min-h-14 rounded-lg border px-3 py-2 text-left text-body transition-[background-color,border-color] duration-(--dur-fast) ease-(--ease-out-soft) active:bg-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        on
                          ? "border-brand-line bg-brand-soft"
                          : "border-hairline-strong",
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-medium">
                        {c.name}
                        {c.fat_quality === "oily" ? (
                          <Pill tone="warn">Oily</Pill>
                        ) : null}
                      </div>
                      <MacroChips macros={c} className="mt-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 mt-4 bg-card pt-2">
        <MacroChips macros={totals} className="mb-2 justify-center" />
        <Button
          size="lg"
          className="w-full"
          disabled={pending || chosen.length === 0}
          onClick={() => onAdd({ itemId, componentIds: [...selected] })}
        >
          {pending ? "Adding..." : `Add bowl (${chosen.length})`}
        </Button>
      </div>
    </div>
  );
}
