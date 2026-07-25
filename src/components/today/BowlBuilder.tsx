"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { MacroChips } from "@/components/ui/MacroChips";
import { Pill } from "@/components/ui/Pill";
import { Segmented } from "@/components/ui/Segmented";
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
      <p className="py-6 text-center text-sm text-muted-foreground">
        No build-your-own meals yet.
      </p>
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
        <Segmented
          className="mb-3"
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
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {comps.map((c) => {
                  const on = selected.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm transition",
                        on
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-accent",
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
