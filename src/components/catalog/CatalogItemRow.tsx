"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { CatalogForm } from "@/components/catalog/CatalogForm";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { MacroChips } from "@/components/ui/MacroChips";
import { Pill } from "@/components/ui/Pill";
import { archiveCatalogItem, updateCatalogItem } from "@/lib/actions/catalog";
import type { CatalogItemFull } from "@/lib/data/catalog";
import { useAction } from "@/hooks/useAction";

export function CatalogItemRow({ item }: { item: CatalogItemFull }) {
  const [editing, setEditing] = useState(false);
  const { pending, run } = useAction();

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{item.name}</span>
          {item.is_composable ? <Pill tone="brand">Build your own</Pill> : null}
          {item.fat_quality === "clean" ? (
            <Pill tone="ok">Clean</Pill>
          ) : item.fat_quality === "oily" ? (
            <Pill tone="warn">Oily</Pill>
          ) : null}
        </div>
        {item.place ? (
          <p className="text-xs text-muted-foreground">{item.place}</p>
        ) : null}
        {item.is_composable ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {item.components.length} components
          </p>
        ) : (
          <MacroChips macros={item} className="mt-1" />
        )}
        {item.notes ? (
          <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        {item.is_composable ? null : (
          <button
            type="button"
            aria-label="Edit"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" />
          </button>
        )}
        <button
          type="button"
          aria-label="Archive"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          disabled={pending}
          onClick={() => {
            if (!confirm("Archive this item?")) return;
            run(() => archiveCatalogItem(item.id), { success: "Archived" });
          }}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <BottomSheet open={editing} onOpenChange={setEditing} title="Edit item">
        <CatalogForm
          submitLabel="Save changes"
          pending={pending}
          initial={{
            name: item.name,
            place: item.place ?? "",
            notes: item.notes ?? "",
            fat_quality: item.fat_quality ?? "",
            protein_g: item.protein_g,
            fat_g: item.fat_g,
            carbs_g: item.carbs_g,
          }}
          onSubmit={(v) =>
            run(
              () =>
                updateCatalogItem({
                  id: item.id,
                  name: v.name,
                  place: v.place || undefined,
                  notes: v.notes || undefined,
                  fat_quality: v.fat_quality || null,
                  protein_g: v.protein_g,
                  fat_g: v.fat_g,
                  carbs_g: v.carbs_g,
                }),
              { success: "Item updated", onDone: () => setEditing(false) },
            )
          }
        />
      </BottomSheet>
    </div>
  );
}
