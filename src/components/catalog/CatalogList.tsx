"use client";

import { useState } from "react";

import { AddCatalogItem } from "@/components/catalog/AddCatalogItem";
import { CatalogItemRow } from "@/components/catalog/CatalogItemRow";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { useCatalogFilter } from "@/components/catalog/useCatalogFilter";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Surface } from "@/components/ui/Surface";
import type { CatalogItemFull } from "@/lib/data/catalog";

export function CatalogList({ items }: { items: CatalogItemFull[] }) {
  const { query, setQuery, quality, setQuality, filtered, isFiltering, clear } =
    useCatalogFilter(items);
  const [interactive, setInteractive] = useState(false);

  if (items.length === 0) {
    return (
      <EmptyState
        title="No saved meals yet"
        body="Save the meals you eat often and logging one takes a single tap."
        action={<AddCatalogItem variant="inline" />}
      />
    );
  }

  const showToolbar = items.length > 5;

  return (
    <>
      {showToolbar ? (
        <CatalogToolbar
          query={query}
          onQueryChange={(v) => {
            setInteractive(true);
            setQuery(v);
          }}
          quality={quality}
          onQualityChange={(v) => {
            setInteractive(true);
            setQuality(v);
          }}
        />
      ) : null}

      {isFiltering && filtered.length > 0 ? (
        <p role="status" aria-live="polite" className="text-meta text-muted-foreground">
          Showing {filtered.length} of {items.length}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          size="sm"
          title="No matches"
          body={
            query.trim()
              ? `Nothing in your catalog matches "${query.trim().slice(0, 24)}${query.trim().length > 24 ? "..." : ""}".`
              : quality === "clean"
                ? "You have no clean meals saved."
                : "You have no oily meals saved."
          }
          action={
            <Button variant="outline" size="md" onClick={clear}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <Surface radius="xl" className="divide-y divide-border">
          {filtered.map((item, i) => (
            <div
              key={item.id}
              className={
                interactive
                  ? "animate-in fade-in duration-(--dur-fast)"
                  : "animate-in fade-in slide-in-from-bottom-1 fill-mode-backwards duration-(--dur-base) ease-(--ease-out-soft)"
              }
              style={interactive ? undefined : { animationDelay: `${Math.min(i, 6) * 70}ms` }}
            >
              <CatalogItemRow item={item} />
            </div>
          ))}
        </Surface>
      )}

      <AddCatalogItem variant="fab" />
    </>
  );
}
