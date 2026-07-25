"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MacroChips } from "@/components/ui/MacroChips";
import { Pill } from "@/components/ui/Pill";
import type { CatalogItem } from "@/lib/db/schema";

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
  const query = q.trim().toLowerCase();
  const filtered = query
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          (i.place ?? "").toLowerCase().includes(query),
      )
    : items;

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search saved meals"
          className="pl-9"
        />
      </div>

      <div className="mt-3 divide-y divide-border">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No matches.
          </p>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {item.name}
                  </span>
                  {item.fat_quality === "oily" ? <Pill tone="warn">Oily</Pill> : null}
                </div>
                {item.place ? (
                  <p className="text-xs text-muted-foreground">{item.place}</p>
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
