"use client";

import { Archive, Trash2 } from "lucide-react";
import { useState } from "react";

import { AddCatalogItem } from "@/components/catalog/AddCatalogItem";
import { CatalogItemRow } from "@/components/catalog/CatalogItemRow";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { useCatalogFilter } from "@/components/catalog/useCatalogFilter";
import { useCatalogSelection } from "@/components/catalog/useCatalogSelection";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";
import { StickyActions } from "@/components/ui/StickyActions";
import { Surface } from "@/components/ui/Surface";
import type { CatalogItemFull } from "@/lib/data/catalog";

function ClearCatalogDialog({
  open,
  onOpenChange,
  total,
  pending,
  onClear,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  pending: boolean;
  onClear: (mode: "archive" | "delete") => void;
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Clear catalog?"
      description={`This affects all ${total} saved ${total === 1 ? "meal" : "meals"}.`}
    >
      <div className="grid gap-2">
        <Button
          variant="solid"
          disabled={pending}
          onClick={() => {
            onClear("archive");
            onOpenChange(false);
          }}
        >
          Archive all
        </Button>
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => {
            onClear("delete");
            onOpenChange(false);
          }}
        >
          Delete all
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

export function CatalogList({ items }: { items: CatalogItemFull[] }) {
  const { query, setQuery, quality, setQuality, filtered, isFiltering, clear } =
    useCatalogFilter(items);
  const [interactive, setInteractive] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const selection = useCatalogSelection();

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
  const selectedCount = selection.selected.size;

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        {selection.active ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setClearOpen(true)}>
              Clear catalog
            </Button>
            <Button variant="ghost" size="sm" onClick={selection.exit}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={selection.enter}>
            Select
          </Button>
        )}
      </div>

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
              <CatalogItemRow
                item={item}
                selectMode={selection.active}
                selected={selection.selected.has(item.id)}
                onToggleSelect={selection.toggle}
              />
            </div>
          ))}
        </Surface>
      )}

      {selection.active ? (
        <StickyActions className="flex items-center justify-between gap-2">
          <span className="text-meta text-muted-foreground">
            {selectedCount === 1 ? "1 selected" : `${selectedCount} selected`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selectedCount === 0 || selection.pending}
              onClick={selection.archiveSelected}
            >
              <Archive className="size-4" strokeWidth={1.5} />
              Archive
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedCount === 0 || selection.pending}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="size-4" strokeWidth={1.5} />
              Delete
            </Button>
          </div>
        </StickyActions>
      ) : null}

      {!selection.active ? <AddCatalogItem variant="fab" /> : null}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Delete ${selectedCount === 1 ? "this item" : `${selectedCount} items`}?`}
        body="This permanently removes them from your catalog. Past logged meals keep their macros."
        confirmLabel="Delete"
        tone="destructive"
        pending={selection.pending}
        onConfirm={selection.deleteSelected}
      />

      <ClearCatalogDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        total={items.length}
        pending={selection.pending}
        onClear={selection.clearAll}
      />
    </>
  );
}
