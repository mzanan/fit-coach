"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { MacroChips } from "@/components/ui/MacroChips";
import { Pill } from "@/components/ui/Pill";
import { MealForm } from "@/components/today/MealForm";
import { deleteMeal, updateMeal } from "@/lib/actions/meals";
import type { Meal } from "@/lib/db/schema";
import { useAction } from "@/hooks/useAction";

export function MealRow({ meal }: { meal: Meal }) {
  const [editing, setEditing] = useState(false);
  const { pending, run } = useAction();

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{meal.name}</span>
          {meal.fat_quality === "clean" ? (
            <Pill tone="ok">Clean</Pill>
          ) : meal.fat_quality === "oily" ? (
            <Pill tone="warn">Oily</Pill>
          ) : null}
        </div>
        {meal.place ? (
          <p className="text-xs text-muted-foreground">{meal.place}</p>
        ) : null}
        <MacroChips macros={meal} className="mt-1" />
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Edit"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Delete"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete this meal?")) return;
            run(() => deleteMeal(meal.id));
          }}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <BottomSheet open={editing} onOpenChange={setEditing} title="Edit meal">
        <MealForm
          submitLabel="Save changes"
          pending={pending}
          showPlace={false}
          initial={{
            name: meal.name,
            category: meal.category,
            fat_quality: meal.fat_quality ?? "",
            protein_g: meal.protein_g,
            fat_g: meal.fat_g,
            carbs_g: meal.carbs_g,
          }}
          onSubmit={(v) =>
            run(
              () =>
                updateMeal({
                  id: meal.id,
                  name: v.name,
                  category: v.category,
                  fat_quality: v.fat_quality || null,
                  protein_g: v.protein_g,
                  fat_g: v.fat_g,
                  carbs_g: v.carbs_g,
                }),
              { success: "Meal updated", onDone: () => setEditing(false) },
            )
          }
        />
      </BottomSheet>
    </div>
  );
}
