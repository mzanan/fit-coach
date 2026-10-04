"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { MacroChips } from "@/components/ui/MacroChips";
import { Pill } from "@/components/ui/Pill";
import { MealForm } from "@/components/today/MealForm";
import { deleteMeal, updateMeal } from "@/lib/actions/meals";
import type { Meal } from "@/lib/db/schema";
import { useAction } from "@/hooks/useAction";

export function MealRow({ meal }: { meal: Meal }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { pending, run } = useAction();

  return (
    <div className="flex items-center gap-1 border-b border-border py-1 last:border-b-0">
      <button
        type="button"
        aria-label={`Edit ${meal.name}`}
        onClick={() => setEditing(true)}
        className="min-h-14 min-w-0 flex-1 rounded-control py-2.5 text-left transition-colors active:bg-overlay"
      >
        <div className="flex items-center gap-2">
          <span className="truncate text-body font-medium">{meal.name}</span>
          {meal.fat_quality === "clean" ? (
            <Pill tone="muted">Clean</Pill>
          ) : meal.fat_quality === "oily" ? (
            <Pill tone="brand">Oily</Pill>
          ) : null}
        </div>
        {meal.place ? (
          <p className="mt-0.5 text-meta text-faint">{meal.place}</p>
        ) : null}
        <MacroChips macros={meal} className="mt-1.5" />
      </button>
      <Button
        variant="danger"
        size="icon"
        aria-label={`Delete ${meal.name}`}
        disabled={pending}
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-[18px]" strokeWidth={1.5} />
      </Button>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this meal?"
        body="It will be removed from today's totals."
        confirmLabel="Delete"
        tone="destructive"
        pending={pending}
        onConfirm={() => run(() => deleteMeal(meal.id))}
      />

      <ResponsiveDialog open={editing} onOpenChange={setEditing} title="Edit meal">
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
      </ResponsiveDialog>
    </div>
  );
}
