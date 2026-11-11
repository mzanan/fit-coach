"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import type { PreviewRule } from "@/components/import/useMdImport";

export function ImportRuleRow({
  rule,
  onToggle,
}: {
  rule: PreviewRule;
  onToggle: (include: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Checkbox
        checked={rule.include}
        onChange={onToggle}
        aria-label={`Include ${rule.key}`}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <span className="text-body font-medium">{rule.key}</span>
        <p className="text-meta text-muted-foreground">{rule.value}</p>
      </div>
    </div>
  );
}
