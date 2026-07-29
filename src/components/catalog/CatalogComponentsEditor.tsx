"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MacroChips } from "@/components/ui/MacroChips";
import { Pill } from "@/components/ui/Pill";
import {
  CatalogComponentForm,
  type CatalogComponentFormValues,
} from "@/components/catalog/CatalogComponentForm";
import {
  createCatalogComponent,
  deleteCatalogComponent,
  updateCatalogComponent,
} from "@/lib/actions/catalog";
import type { CatalogComponent } from "@/lib/db/schema";
import { useAction } from "@/hooks/useAction";

function CatalogComponentRow({ component }: { component: CatalogComponent }) {
  const { pending, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (editing) {
    return (
      <CatalogComponentForm
        submitLabel="Save component"
        pending={pending}
        initial={{
          name: component.name,
          group_name: component.group_name as CatalogComponentFormValues["group_name"],
          fat_quality: component.fat_quality ?? "",
          protein_g: component.protein_g,
          fat_g: component.fat_g,
          carbs_g: component.carbs_g,
        }}
        onCancel={() => setEditing(false)}
        onSubmit={(v) =>
          run(
            () =>
              updateCatalogComponent({
                id: component.id,
                name: v.name,
                group_name: v.group_name,
                fat_quality: v.fat_quality || null,
                protein_g: v.protein_g,
                fat_g: v.fat_g,
                carbs_g: v.carbs_g,
              }),
            { onDone: () => setEditing(false) },
          )
        }
      />
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg bg-well px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-body">{component.name}</span>
          {component.fat_quality === "oily" ? <Pill tone="warn">Oily</Pill> : null}
        </div>
        <MacroChips macros={component} className="mt-0.5" />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Edit ${component.name}`}
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-[18px] text-muted-foreground" strokeWidth={1.5} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${component.name}`}
          onClick={() => setConfirmingDelete(true)}
        >
          <Trash2 className="size-[18px] text-muted-foreground" strokeWidth={1.5} />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Remove this component?"
        body="It is removed from this build-your-own item. Past meals built from it keep their macros."
        confirmLabel="Remove"
        tone="danger"
        pending={pending}
        onConfirm={() => run(() => deleteCatalogComponent(component.id))}
      />
    </div>
  );
}

export function CatalogComponentsEditor({
  itemId,
  components,
}: {
  itemId: string;
  components: CatalogComponent[];
}) {
  const { pending, run } = useAction();
  const [adding, setAdding] = useState(false);

  return (
    <div className="mt-5">
      <p className="eyebrow mb-2">Components</p>

      <div className="space-y-2">
        {components.map((c) => (
          <CatalogComponentRow key={c.id} component={c} />
        ))}
      </div>

      {adding ? (
        <div className="mt-2">
          <CatalogComponentForm
            submitLabel="Add component"
            pending={pending}
            onCancel={() => setAdding(false)}
            onSubmit={(v) =>
              run(
                () =>
                  createCatalogComponent({
                    item_id: itemId,
                    name: v.name,
                    group_name: v.group_name,
                    fat_quality: v.fat_quality || null,
                    protein_g: v.protein_g,
                    fat_g: v.fat_g,
                    carbs_g: v.carbs_g,
                  }),
                { onDone: () => setAdding(false) },
              )
            }
          />
        </div>
      ) : (
        <Button
          variant="outline"
          size="md"
          className="mt-2 w-full"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-4" />
          Add component
        </Button>
      )}
    </div>
  );
}
