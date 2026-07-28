"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchField } from "@/components/ui/SearchField";
import { Surface } from "@/components/ui/Surface";
import { MealPickerRow } from "@/components/today/MealPickerRow";
import type { PickerItem } from "@/components/today/useAddMeal";
import { useAddMeal } from "@/components/today/useAddMeal";
import type { CatalogItemFull } from "@/lib/data/catalog";
import type { RecentMeal } from "@/lib/data/recentMeals";

export function MealPicker({
  catalog,
  recents,
  category,
  day,
  pending,
  onPicked,
  onManualFallback,
}: {
  catalog: CatalogItemFull[];
  recents: RecentMeal[];
  category: string;
  day: string;
  pending: boolean;
  onPicked: (action: () => Promise<string>) => void;
  onManualFallback: (name: string) => void;
}) {
  const { query, setQuery, recentItems, catalogItems, isEmpty } = useAddMeal({
    catalog,
    recents,
  });
  const [addingKey, setAddingKey] = useState<string | null>(null);

  function pick(item: PickerItem) {
    setAddingKey(item.key);
    onPicked(() => item.action(category, day));
  }

  if (isEmpty) {
    return (
      <EmptyState
        size="sm"
        title="Nothing saved yet"
        body="Enter a meal manually or build a bowl. Anything you log shows up here next time."
      />
    );
  }

  const noMatches =
    query.trim() !== "" && recentItems.length === 0 && catalogItems.length === 0;

  return (
    <div>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search saved meals"
        aria-label="Search saved meals"
        className="mb-3"
      />

      {noMatches ? (
        <EmptyState
          size="sm"
          title="No matches"
          body={`Nothing saved matches "${query.trim().slice(0, 24)}${query.trim().length > 24 ? "..." : ""}".`}
          action={
            <Button
              variant="outline"
              size="md"
              onClick={() => onManualFallback(query.trim())}
            >
              Enter manually
            </Button>
          }
        />
      ) : (
        <>
          {recentItems.length > 0 ? (
            <div>
              <p className="eyebrow sticky top-0 z-10 bg-card py-2">Recent</p>
              <Surface radius="xl" className="divide-y divide-border">
                {recentItems.map((item) => (
                  <MealPickerRow
                    key={item.key}
                    item={item}
                    disabled={pending}
                    adding={pending && addingKey === item.key}
                    onPick={pick}
                  />
                ))}
              </Surface>
            </div>
          ) : null}

          {catalogItems.length > 0 ? (
            <div className="mt-4">
              <p className="eyebrow sticky top-0 z-10 bg-card py-2">All saved</p>
              <Surface radius="xl" className="divide-y divide-border">
                {catalogItems.map((item) => (
                  <MealPickerRow
                    key={item.key}
                    item={item}
                    disabled={pending}
                    adding={pending && addingKey === item.key}
                    onPick={pick}
                  />
                ))}
              </Surface>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
