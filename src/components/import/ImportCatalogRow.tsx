"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import { MacroChips } from "@/components/ui/MacroChips";
import type { PreviewCatalogItem } from "@/components/import/useMdImport";

export function ImportCatalogRow({
  item,
  onToggle,
}: {
  item: PreviewCatalogItem;
  onToggle: (include: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Checkbox
        checked={item.include}
        onChange={onToggle}
        aria-label={`Include ${item.name}`}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <span className="truncate text-body font-medium">{item.name}</span>
        {item.place ? (
          <p className="text-meta text-muted-foreground">{item.place}</p>
        ) : null}
        <MacroChips
          macros={{
            protein_g: item.protein_g ?? null,
            fat_g: item.fat_g ?? null,
            carbs_g: item.carbs_g ?? null,
          }}
          className="mt-1"
        />
      </div>
    </div>
  );
}
