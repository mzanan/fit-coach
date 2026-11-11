"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { MacroInputs, type MacroValues } from "@/components/ui/MacroInputs";
import { Segmented } from "@/components/ui/Segmented";
import { COMPONENT_GROUPS, FAT_QUALITY_OPTIONS, type ComponentGroup } from "@/lib/constants";

export interface CatalogComponentFormValues extends MacroValues {
  name: string;
  group_name: ComponentGroup;
  fat_quality: string;
}

export function CatalogComponentForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<CatalogComponentFormValues>;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: CatalogComponentFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<CatalogComponentFormValues>({
    name: initial?.name ?? "",
    group_name: initial?.group_name ?? COMPONENT_GROUPS[0].key,
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
    <form onSubmit={submit} className="space-y-3 rounded-lg bg-well p-3">
      <div>
        <Label htmlFor="comp-name">Name</Label>
        <Input
          id="comp-name"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          placeholder="Component name"
          autoFocus
          required
        />
      </div>

      <div>
        <Label>Group</Label>
        <Segmented
          options={COMPONENT_GROUPS.map((g) => ({ value: g.key, label: g.label }))}
          value={values.group_name}
          onChange={(v) => setValues({ ...values, group_name: v as ComponentGroup })}
        />
      </div>

      <MacroInputs value={values} onChange={(m) => setValues({ ...values, ...m })} />

      <div>
        <Label>Fat quality</Label>
        <Segmented
          options={FAT_QUALITY_OPTIONS}
          value={values.fat_quality}
          onChange={(v) => setValues({ ...values, fat_quality: v })}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="md" className="flex-1" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </Button>
        <Button type="button" variant="ghost" size="md" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
