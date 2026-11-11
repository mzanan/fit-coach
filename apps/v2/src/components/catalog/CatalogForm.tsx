"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, Label } from "@/components/ui/Input";
import {
  OptionalMacroInputs,
  type OptionalMacroValues,
} from "@/components/ui/MacroInputs";
import { Segmented } from "@/components/ui/Segmented";
import { ToggleChip } from "@/components/ui/ToggleChip";
import {
  AUTO_DAY_TYPE_OPTIONS,
  COMPANY_SEGMENT_OPTIONS,
  FAT_QUALITY_OPTIONS,
  MEAL_CATEGORIES,
} from "@/lib/constants";
import { WEEKDAY_LABELS } from "@/lib/dates";

export interface CatalogFormValues extends OptionalMacroValues {
  name: string;
  place: string;
  notes: string;
  fat_quality: string;
  delivery: boolean;
  dinner_only: boolean;
  company: string;
  closed_weekdays: number[];
  auto_day_type: string;
  auto_category: string;
}

export function CatalogForm({
  initial,
  submitLabel,
  pending,
  hideMacros,
  onSubmit,
}: {
  initial?: Partial<CatalogFormValues>;
  submitLabel: string;
  pending: boolean;
  hideMacros?: boolean;
  onSubmit: (values: CatalogFormValues) => void;
}) {
  const [values, setValues] = useState<CatalogFormValues>({
    name: initial?.name ?? "",
    place: initial?.place ?? "",
    notes: initial?.notes ?? "",
    fat_quality: initial?.fat_quality ?? "",
    protein_g: initial?.protein_g ?? null,
    fat_g: initial?.fat_g ?? null,
    carbs_g: initial?.carbs_g ?? null,
    delivery: initial?.delivery ?? false,
    dinner_only: initial?.dinner_only ?? false,
    company: initial?.company ?? "",
    closed_weekdays: initial?.closed_weekdays ?? [],
    auto_day_type: initial?.auto_day_type ?? "",
    auto_category: initial?.auto_category ?? "",
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

      {hideMacros ? null : (
        <OptionalMacroInputs
          value={values}
          onChange={(m) => setValues({ ...values, ...m })}
        />
      )}

      <div>
        <Label>Fat quality</Label>
        <Segmented
          options={FAT_QUALITY_OPTIONS}
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

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-meta">
          <Checkbox
            checked={values.delivery}
            onChange={(delivery) => setValues({ ...values, delivery })}
          />
          Delivery
        </label>
        <label className="flex items-center gap-2 text-meta">
          <Checkbox
            checked={values.dinner_only}
            onChange={(dinner_only) => setValues({ ...values, dinner_only })}
          />
          Dinner only
        </label>
      </div>

      <div>
        <Label>Company</Label>
        <Segmented
          options={COMPANY_SEGMENT_OPTIONS}
          value={values.company}
          onChange={(company) => setValues({ ...values, company })}
        />
      </div>

      <div>
        <Label>Closed weekdays</Label>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAY_LABELS.map((label, weekday) => (
            <ToggleChip
              key={weekday}
              size="sm"
              pressedState={values.closed_weekdays.includes(weekday)}
              onPressedChange={(pressed) =>
                setValues({
                  ...values,
                  closed_weekdays: pressed
                    ? [...values.closed_weekdays, weekday]
                    : values.closed_weekdays.filter((d) => d !== weekday),
                })
              }
            >
              {label}
            </ToggleChip>
          ))}
        </div>
      </div>

      <div>
        <Label>Auto-insert on day type</Label>
        <Segmented
          options={AUTO_DAY_TYPE_OPTIONS}
          value={values.auto_day_type}
          onChange={(auto_day_type) =>
            setValues({
              ...values,
              auto_day_type,
              auto_category: auto_day_type ? values.auto_category : "",
            })
          }
        />
      </div>

      {values.auto_day_type ? (
        <div>
          <Label>Auto-insert category</Label>
          <Segmented
            options={MEAL_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
            value={values.auto_category}
            onChange={(auto_category) => setValues({ ...values, auto_category })}
          />
        </div>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
