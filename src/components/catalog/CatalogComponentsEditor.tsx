"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
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

  if (confirmingDelete) {
    return (
      <div className="rounded-lg bg-well px-3 py-2.5">
        <p className="text-body">Remove {component.name}?</p>
        <p className="mt-0.5 text-meta text-muted-foreground">
          It is removed from this build-your-own item. Past meals keep their macros.
        </p>
        <div className="mt-2.5 flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => run(() => deleteCatalogComponent(component.id))}
          >
            Remove
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setConfirmingDelete(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg bg-well px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-body">{component.name}</span>
          {component.fat_quality === "oily" ? <Pill tone="brand">Oily</Pill> : null}
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
          <Pencil className="size-[18px]" strokeWidth={1.5} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${component.name}`}
          onClick={() => setConfirmingDelete(true)}
        >
          <Trash2 className="size-[18px]" strokeWidth={1.5} />
        </Button>
      </div>
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
