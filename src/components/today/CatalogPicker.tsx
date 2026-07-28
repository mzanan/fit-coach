"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { MacroChips } from "@/components/ui/MacroChips";
import { Pill } from "@/components/ui/Pill";
import { SearchField } from "@/components/ui/SearchField";
import type { CatalogItem } from "@/lib/db/schema";
import { normalizeSearch } from "@/lib/search";

export function CatalogPicker({
  items,
  pending,
  onPick,
}: {
  items: CatalogItem[];
  pending: boolean;
  onPick: (itemId: string) => void;
}) {
  const [q, setQ] = useState("");
  const query = normalizeSearch(q);
  const filtered = query
    ? items.filter(
        (i) =>
          normalizeSearch(i.name).includes(query) ||
          normalizeSearch(i.place ?? "").includes(query),
      )
    : items;

  return (
    <div>
      <SearchField
        value={q}
        onChange={setQ}
        placeholder="Search saved meals"
        aria-label="Search saved meals"
      />

      <div className="mt-3 divide-y divide-border">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-meta text-muted-foreground">
            No matches.
          </p>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-body font-medium">
                    {item.name}
                  </span>
                  {item.fat_quality === "oily" ? <Pill tone="warn">Oily</Pill> : null}
                </div>
                {item.place ? (
                  <p className="text-meta text-muted-foreground">{item.place}</p>
                ) : null}
                <MacroChips macros={item} className="mt-1" />
              </div>
              <Button
                size="icon"
                aria-label={`Add ${item.name}`}
                disabled={pending}
                onClick={() => onPick(item.id)}
              >
                <Plus className="size-5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
