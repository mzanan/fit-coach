"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { MacroInputs, type MacroValues } from "@/components/ui/MacroInputs";
import { Segmented } from "@/components/ui/Segmented";
import { MEAL_CATEGORIES, FAT_QUALITIES } from "@/lib/constants";

export interface MealFormValues extends MacroValues {
  name: string;
  place: string;
  category: string;
  fat_quality: string;
}

const FAT_OPTIONS = [
  { value: "", label: "Unset" },
  ...FAT_QUALITIES.map((f) => ({ value: f.key, label: f.label })),
];

export function MealForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  showPlace = true,
}: {
  initial?: Partial<MealFormValues>;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: MealFormValues) => void;
  showPlace?: boolean;
}) {
  const [values, setValues] = useState<MealFormValues>({
    name: initial?.name ?? "",
    place: initial?.place ?? "",
    category: initial?.category ?? MEAL_CATEGORIES[2].key,
    fat_quality: initial?.fat_quality ?? "",
    protein_g: initial?.protein_g ?? 0,
    fat_g: initial?.fat_g ?? 0,
    carbs_g: initial?.carbs_g ?? 0,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) return;
    onSubmit(values);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="meal-name">Name</Label>
        <Input
          id="meal-name"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          placeholder="What did you eat?"
          required
        />
      </div>

      {showPlace ? (
        <div>
          <Label htmlFor="meal-place">Place (optional)</Label>
          <Input
            id="meal-place"
            value={values.place}
            onChange={(e) => setValues({ ...values, place: e.target.value })}
            placeholder="Restaurant / delivery"
          />
        </div>
      ) : null}

      <div>
        <Label>Meal</Label>
        <Segmented
          options={MEAL_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
          value={values.category}
          onChange={(v) => setValues({ ...values, category: v })}
        />
      </div>

      <MacroInputs
        value={values}
        onChange={(m) => setValues({ ...values, ...m })}
      />

      <div>
        <Label>Fat quality</Label>
        <Segmented
          options={FAT_OPTIONS}
          value={values.fat_quality}
          onChange={(v) => setValues({ ...values, fat_quality: v })}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
