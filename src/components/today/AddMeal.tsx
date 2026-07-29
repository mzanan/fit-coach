"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";
import { Button } from "@/components/ui/Button";
import { ChipRow } from "@/components/ui/ChipRow";
import { BowlBuilder } from "@/components/today/BowlBuilder";
import { MealForm } from "@/components/today/MealForm";
import { MealPicker } from "@/components/today/MealPicker";
import {
  addComposableMeal,
  addManualMeal,
  deleteMeal,
} from "@/lib/actions/meals";
import { MEAL_CATEGORIES } from "@/lib/constants";
import type { CatalogItemFull } from "@/lib/data/catalog";
import type { RecentMeal } from "@/lib/data/recentMeals";
import { formatDayLabel, inferMealCategory, type DayConfig } from "@/lib/dates";
import { useAction } from "@/hooks/useAction";

type Mode = "search" | "build" | "manual";

export function AddMeal({
  catalog,
  recents,
  day,
  today,
  cfg,
  isGymDay,
  variant = "fab",
}: {
  catalog: CatalogItemFull[];
  recents: RecentMeal[];
  day: string;
  today: string;
  cfg: DayConfig;
  isGymDay: boolean;
  variant?: "fab" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("search");
  const [category, setCategory] = useState<string>(MEAL_CATEGORIES[2].key);
  const [manualPrefill, setManualPrefill] = useState("");
  const { pending, run } = useAction();

  const composable = catalog.filter((c) => c.is_composable);
  const isToday = day === today;

  function openSheet() {
    setMode("search");
    setManualPrefill("");
    setCategory(
      isToday
        ? inferMealCategory(new Date(), cfg, isGymDay)
        : MEAL_CATEGORIES[2].key,
    );
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  const title =
    mode === "build" ? "Build a bowl" : mode === "manual" ? "Manual entry" : "Add meal";
  const description = !isToday ? `Adding to ${formatDayLabel(day, today)}` : undefined;

  const footer =
    mode === "search" ? (
      <div className={composable.length > 0 ? "grid grid-cols-2 gap-2" : ""}>
        {composable.length > 0 ? (
          <Button variant="outline" size="md" onClick={() => setMode("build")}>
            Build a bowl
          </Button>
        ) : null}
        <Button variant="outline" size="md" onClick={() => setMode("manual")}>
          Manual entry
        </Button>
      </div>
    ) : (
      <Button
        variant="ghost"
        size="md"
        className="w-full"
        onClick={() => setMode("search")}
      >
        Back to search
      </Button>
    );

  return (
    <>
      {variant === "fab" ? (
        <Button
          size="icon"
          aria-label="Add meal"
          className="fixed right-gutter bottom-[calc(var(--spacing-nav)+var(--spacing-safe-b))] z-40 size-14 rounded-full shadow-raised md:hidden"
          onClick={openSheet}
        >
          <Plus className="size-6" />
        </Button>
      ) : (
        <Button size="md" onClick={openSheet}>
          <Plus className="size-[18px]" strokeWidth={1.5} />
          Add meal
        </Button>
      )}

      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        footer={footer}
      >
        <ChipRow
          className="mb-3 -mx-5 px-5 sm:mx-0 sm:px-0"
          ariaLabel="Meal category"
          options={MEAL_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
          value={category}
          onChange={setCategory}
        />

        {mode === "search" ? (
          <MealPicker
            catalog={catalog}
            recents={recents}
            category={category}
            day={day}
            pending={pending}
            onPicked={(action) =>
              run(action, {
                success: "Meal added",
                onDone: close,
                undo: (id: string) => deleteMeal(id),
                undoSuccess: "Meal removed",
              })
            }
            onManualFallback={(name) => {
              setManualPrefill(name);
              setMode("manual");
            }}
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
            showCategory={false}
            initial={{ name: manualPrefill, category }}
            onSubmit={(v) =>
              run(
                () =>
                  addManualMeal({
                    name: v.name,
                    place: v.place || undefined,
                    category,
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
      </ResponsiveDialog>
    </>
  );
}
