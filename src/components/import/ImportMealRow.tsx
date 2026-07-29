"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";
import { Checkbox } from "@/components/ui/Checkbox";
import { MacroChips } from "@/components/ui/MacroChips";
import { Pill } from "@/components/ui/Pill";
import { MealForm } from "@/components/today/MealForm";
import { categoryLabel } from "@/lib/constants";
import type { ImportedMeal } from "@/lib/ai/mdImport";
import type { PreviewMeal } from "@/components/import/useMdImport";

export function ImportMealRow({
  meal,
  onToggle,
  onUpdate,
}: {
  meal: PreviewMeal;
  onToggle: (include: boolean) => void;
  onUpdate: (values: Partial<ImportedMeal>) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-start gap-3 py-2.5">
      <Checkbox
        checked={meal.include}
        onChange={onToggle}
        aria-label={`Include ${meal.name}`}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-body font-medium">{meal.name}</span>
          {meal.fat_quality === "clean" ? (
            <Pill tone="muted">Clean</Pill>
          ) : meal.fat_quality === "oily" ? (
            <Pill tone="brand">Oily</Pill>
          ) : null}
        </div>
        <p className="text-meta text-muted-foreground">
          {categoryLabel(meal.category)}
          {meal.place ? ` · ${meal.place}` : ""}
        </p>
        <MacroChips macros={meal} className="mt-1" />
      </div>
      <button
        type="button"
        aria-label="Edit"
        className="rounded-control p-1.5 text-muted-foreground hover:bg-accent"
        onClick={() => setEditing(true)}
      >
        <Pencil className="size-4" />
      </button>

      <ResponsiveDialog open={editing} onOpenChange={setEditing} title="Edit meal">
        <MealForm
          submitLabel="Save changes"
          pending={false}
          initial={{
            name: meal.name,
            place: meal.place ?? "",
            category: meal.category,
            fat_quality: meal.fat_quality ?? "",
            protein_g: meal.protein_g,
            fat_g: meal.fat_g,
            carbs_g: meal.carbs_g,
          }}
          onSubmit={(v) => {
            onUpdate({
              name: v.name,
              place: v.place || null,
              category: v.category as ImportedMeal["category"],
              fat_quality: (v.fat_quality || null) as ImportedMeal["fat_quality"],
              protein_g: v.protein_g,
              fat_g: v.fat_g,
              carbs_g: v.carbs_g,
            });
            setEditing(false);
          }}
        />
      </ResponsiveDialog>
    </div>
  );
}
