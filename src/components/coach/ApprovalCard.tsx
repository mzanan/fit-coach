"use client";

import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { MacroChips } from "@/components/ui/MacroChips";
import { Surface } from "@/components/ui/Surface";
import { categoryLabel } from "@/lib/constants";
import type { PendingPreview } from "@/lib/data/coachPendingWrite";

export function ApprovalCard({
  previews,
  busy,
  onDecide,
}: {
  previews: PendingPreview[];
  busy: boolean;
  onDecide: (approved: boolean) => void;
}) {
  if (!previews.length) return null;

  return (
    <Surface level="raised" className="rounded-control p-4">
      <p className="text-meta text-muted-foreground">
        {previews.length === 1 ? "Log this meal?" : "Log these meals?"} Nothing
        is written until you confirm.
      </p>
      <div className="mt-3 space-y-4">
        {previews.map((preview, index) => (
          <div key={`${preview.name}-${index}`} className="space-y-1">
            <p className="text-body font-medium">
              {preview.name}
              {preview.portions === 1 ? null : (
                <span className="text-muted-foreground">
                  {" "}
                  x{preview.portions}
                </span>
              )}
            </p>
            <p className="text-meta text-muted-foreground">
              {categoryLabel(preview.category)}
              {preview.place ? ` at ${preview.place}` : ""}
            </p>
            <MacroChips macros={preview} className="pt-1" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => onDecide(true)}
        >
          <Check className="size-4" strokeWidth={1.5} />
          {previews.length === 1 ? "Log it" : "Log them"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onDecide(false)}
        >
          <X className="size-4" strokeWidth={1.5} />
          Cancel
        </Button>
      </div>
    </Surface>
  );
}
