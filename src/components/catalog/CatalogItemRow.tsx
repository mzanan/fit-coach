"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { CatalogComponentsEditor } from "@/components/catalog/CatalogComponentsEditor";
import { CatalogForm } from "@/components/catalog/CatalogForm";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";
import { MacroChips } from "@/components/ui/MacroChips";
import { Pill } from "@/components/ui/Pill";
import { archiveCatalogItem, updateCatalogItem } from "@/lib/actions/catalog";
import type { CatalogItemFull } from "@/lib/data/catalog";
import { useAction } from "@/hooks/useAction";

export function CatalogItemRow({ item }: { item: CatalogItemFull }) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { pending, run } = useAction();

  return (
    <div className="flex items-start gap-3 px-card py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-body font-medium">
            {item.name}
          </span>
          {item.is_composable ? (
            <Pill tone="brand" className="shrink-0">
              Build your own
            </Pill>
          ) : null}
          {item.fat_quality === "oily" ? (
            <Pill tone="brand" className="shrink-0">
              Oily
            </Pill>
          ) : null}
        </div>
        {item.place ? (
          <p className="mt-0.5 text-meta text-muted-foreground">{item.place}</p>
        ) : null}
        {item.is_composable ? (
          <p className="mt-1.5 text-meta text-muted-foreground">
            {item.components.length === 1
              ? "1 component"
              : `${item.components.length} components`}
          </p>
        ) : (
          <MacroChips macros={item} className="mt-1.5" />
        )}
        {item.notes ? (
          <p className="mt-1 line-clamp-1 text-meta text-muted-foreground">
            {item.notes}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Edit ${item.name}`}
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-[18px]" strokeWidth={1.5} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Archive ${item.name}`}
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-[18px]" strokeWidth={1.5} />
        </Button>
      </div>

      <ResponsiveDialog
        open={editing}
        onOpenChange={setEditing}
        title={item.is_composable ? "Edit build-your-own item" : "Edit item"}
      >
        <CatalogForm
          submitLabel="Save changes"
          pending={pending}
          hideMacros={item.is_composable}
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
                  protein_g: item.is_composable ? null : v.protein_g,
                  fat_g: item.is_composable ? null : v.fat_g,
                  carbs_g: item.is_composable ? null : v.carbs_g,
                }),
              { success: "Item updated", onDone: () => setEditing(false) },
            )
          }
        />
        {item.is_composable ? (
          <CatalogComponentsEditor itemId={item.id} components={item.components} />
        ) : null}
      </ResponsiveDialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Archive this item?"
        body="It stops appearing in your catalog and in the meal picker. Past meals keep their macros."
        confirmLabel="Archive"
        tone="destructive"
        pending={pending}
        onConfirm={() => run(() => archiveCatalogItem(item.id), { success: "Archived" })}
      />
    </div>
  );
}
