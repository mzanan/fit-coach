"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { BowlBuilder } from "@/components/today/BowlBuilder";
import { CatalogPicker } from "@/components/today/CatalogPicker";
import { MealForm } from "@/components/today/MealForm";
import {
  addComposableMeal,
  addManualMeal,
  addMealFromCatalog,
} from "@/lib/actions/meals";
import { MEAL_CATEGORIES } from "@/lib/constants";
import type { CatalogItemFull } from "@/lib/data/catalog";
import { useAction } from "@/hooks/useAction";

const MODES = [
  { value: "catalog", label: "Saved" },
  { value: "build", label: "Build" },
  { value: "manual", label: "Manual" },
];

export function AddMeal({
  catalog,
  day,
}: {
  catalog: CatalogItemFull[];
  day: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("catalog");
  const [category, setCategory] = useState(MEAL_CATEGORIES[2].key as string);
  const { pending, run } = useAction();

  const simple = catalog.filter((c) => !c.is_composable);
  const composable = catalog.filter((c) => c.is_composable);
  const close = () => setOpen(false);

  return (
    <>
      <Button
        size="icon"
        aria-label="Add meal"
        className="fixed bottom-20 right-4 z-40 size-14 rounded-full shadow-lg md:bottom-8"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-6" />
      </Button>

      <BottomSheet open={open} onOpenChange={setOpen} title="Add meal">
        <Segmented
          options={MODES}
          value={mode}
          onChange={setMode}
          className="mb-3"
        />

        {mode !== "manual" ? (
          <Segmented
            className="mb-4"
            options={MEAL_CATEGORIES.map((c) => ({
              value: c.key,
              label: c.label,
            }))}
            value={category}
            onChange={setCategory}
          />
        ) : null}

        {mode === "catalog" ? (
          <CatalogPicker
            items={simple}
            pending={pending}
            onPick={(itemId) =>
              run(() => addMealFromCatalog({ itemId, category, day }), {
                success: "Meal added",
                onDone: close,
              })
            }
          />
        ) : null}

        {mode === "build" ? (
          <BowlBuilder
            items={composable}
            pending={pending}
            onAdd={({ itemId, componentIds }) =>
              run(
                () => addComposableMeal({ itemId, componentIds, category, day }),
                { success: "Bowl added", onDone: close },
              )
            }
          />
        ) : null}

        {mode === "manual" ? (
          <MealForm
            submitLabel="Add meal"
            pending={pending}
            onSubmit={(v) =>
              run(
                () =>
                  addManualMeal({
                    name: v.name,
                    place: v.place || undefined,
                    category: v.category,
                    day,
                    fat_quality: v.fat_quality || null,
                    protein_g: v.protein_g,
                    fat_g: v.fat_g,
                    carbs_g: v.carbs_g,
                  }),
                { success: "Meal added", onDone: close },
              )
            }
          />
        ) : null}
      </BottomSheet>
    </>
  );
}
