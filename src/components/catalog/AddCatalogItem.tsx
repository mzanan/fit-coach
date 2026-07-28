"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { CatalogForm } from "@/components/catalog/CatalogForm";
import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";
import { Button } from "@/components/ui/Button";
import { createCatalogItem } from "@/lib/actions/catalog";
import { useAction } from "@/hooks/useAction";

export function AddCatalogItem({
  variant = "fab",
}: {
  variant?: "fab" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();

  return (
    <>
      {variant === "fab" ? (
        <Button
          size="icon"
          aria-label="Add catalog item"
          className="fixed right-4 bottom-[calc(var(--spacing-nav)+env(safe-area-inset-bottom)+var(--spacing-tight))] z-40 size-14 rounded-full shadow-raised md:hidden"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-6" />
        </Button>
      ) : (
        <Button size="md" onClick={() => setOpen(true)}>
          <Plus className="size-[18px]" strokeWidth={1.5} />
          Add meal
        </Button>
      )}

      <ResponsiveDialog open={open} onOpenChange={setOpen} title="New saved meal">
        <CatalogForm
          submitLabel="Save to catalog"
          pending={pending}
          onSubmit={(v) =>
            run(
              () =>
                createCatalogItem({
                  name: v.name,
                  place: v.place || undefined,
                  notes: v.notes || undefined,
                  fat_quality: v.fat_quality || null,
                  protein_g: v.protein_g,
                  fat_g: v.fat_g,
                  carbs_g: v.carbs_g,
                }),
              { success: "Saved to catalog", onDone: () => setOpen(false) },
            )
          }
        />
      </ResponsiveDialog>
    </>
  );
}
