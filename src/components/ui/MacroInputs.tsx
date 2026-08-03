"use client";

import { Input, Label } from "@/components/ui/Input";
import { kcalOf } from "@/lib/macros";

export interface MacroValues {
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export interface OptionalMacroValues {
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
}

const FIELDS: { key: keyof MacroValues; label: string }[] = [
  { key: "protein_g", label: "Protein" },
  { key: "carbs_g", label: "Carbs" },
  { key: "fat_g", label: "Fat" },
];

function Fields({
  value,
  onChange,
  optional,
}: {
  value: OptionalMacroValues;
  onChange: (value: OptionalMacroValues) => void;
  optional?: boolean;
}) {
  const known = FIELDS.filter((f) => value[f.key] !== null);
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {FIELDS.map((f) => {
          const current = value[f.key];
          return (
            <div key={f.key}>
              <Label htmlFor={f.key}>{f.label} (g)</Label>
              <Input
                id={f.key}
                type="number"
                inputMode="decimal"
                min={0}
                placeholder={optional ? "Unknown" : undefined}
                value={current === null || !Number.isFinite(current) ? "" : current}
                onChange={(e) => {
                  const raw = e.target.value;
                  const next =
                    raw === "" ? (optional ? null : 0) : Number(raw) || 0;
                  onChange({ ...value, [f.key]: next });
                }}
              />
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {known.length === 0 && optional
          ? "Macros unknown"
          : `${Math.round(
              kcalOf({
                protein_g: value.protein_g ?? 0,
                fat_g: value.fat_g ?? 0,
                carbs_g: value.carbs_g ?? 0,
              }),
            )} kcal${optional && known.length < FIELDS.length ? " so far" : ""}`}
      </p>
    </div>
  );
}

export function MacroInputs({
  value,
  onChange,
}: {
  value: MacroValues;
  onChange: (value: MacroValues) => void;
}) {
  return (
    <Fields
      value={value}
      onChange={(next) =>
        onChange({
          protein_g: next.protein_g ?? 0,
          fat_g: next.fat_g ?? 0,
          carbs_g: next.carbs_g ?? 0,
        })
      }
    />
  );
}

export function OptionalMacroInputs({
  value,
  onChange,
}: {
  value: OptionalMacroValues;
  onChange: (value: OptionalMacroValues) => void;
}) {
  return <Fields value={value} onChange={onChange} optional />;
}
