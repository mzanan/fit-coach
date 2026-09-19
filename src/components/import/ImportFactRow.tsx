"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import type { PreviewFact } from "@/components/import/useMdImport";
import { coachFactCategoryLabel } from "@/lib/constants";

export function ImportFactRow({
  fact,
  onToggle,
}: {
  fact: PreviewFact;
  onToggle: (include: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Checkbox
        checked={fact.include}
        onChange={onToggle}
        aria-label={`Include ${fact.content}`}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p className="text-body">{fact.content}</p>
        <p className="text-meta text-muted-foreground">
          {coachFactCategoryLabel(fact.category)}
        </p>
      </div>
    </div>
  );
}
