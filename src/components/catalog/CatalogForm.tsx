"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { MacroInputs, type MacroValues } from "@/components/ui/MacroInputs";
import { Segmented } from "@/components/ui/Segmented";
import { FAT_QUALITIES } from "@/lib/constants";

export interface CatalogFormValues extends MacroValues {
  name: string;
  place: string;
  notes: string;
  fat_quality: string;
}

const FAT_OPTIONS = [
  { value: "", label: "Unset" },
  ...FAT_QUALITIES.map((f) => ({ value: f.key, label: f.label })),
];

export function CatalogForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
}: {
  initial?: Partial<CatalogFormValues>;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: CatalogFormValues) => void;
}) {
  const [values, setValues] = useState<CatalogFormValues>({
    name: initial?.name ?? "",
    place: initial?.place ?? "",
    notes: initial?.notes ?? "",
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
        <Label htmlFor="cat-name">Name</Label>
        <Input
          id="cat-name"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          placeholder="Dish name"
          required
        />
      </div>
      <div>
        <Label htmlFor="cat-place">Place (optional)</Label>
        <Input
          id="cat-place"
          value={values.place}
          onChange={(e) => setValues({ ...values, place: e.target.value })}
          placeholder="Restaurant / delivery"
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

      <div>
        <Label htmlFor="cat-notes">Notes (optional)</Label>
        <Input
          id="cat-notes"
          value={values.notes}
          onChange={(e) => setValues({ ...values, notes: e.target.value })}
          placeholder="e.g. sauce on the side, cooked clean"
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
