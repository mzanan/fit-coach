"use client";

import { Input, Label } from "@/components/ui/Input";
import { kcalOf } from "@/lib/macros";

export interface MacroValues {
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

const FIELDS: { key: keyof MacroValues; label: string }[] = [
  { key: "protein_g", label: "Protein" },
  { key: "carbs_g", label: "Carbs" },
  { key: "fat_g", label: "Fat" },
];

export function MacroInputs({
  value,
  onChange,
}: {
  value: MacroValues;
  onChange: (value: MacroValues) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <Label htmlFor={f.key}>{f.label} (g)</Label>
            <Input
              id={f.key}
              type="number"
              inputMode="decimal"
              min={0}
              value={Number.isFinite(value[f.key]) ? value[f.key] : 0}
              onChange={(e) =>
                onChange({ ...value, [f.key]: Number(e.target.value) || 0 })
              }
            />
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {Math.round(kcalOf(value))} kcal
      </p>
    </div>
  );
}
