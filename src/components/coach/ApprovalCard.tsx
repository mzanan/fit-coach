"use client";

import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { MacroChips } from "@/components/ui/MacroChips";
import { Surface } from "@/components/ui/Surface";
import { categoryLabel } from "@/lib/constants";
import type { PendingPreview } from "@/lib/data/coachPendingWrite";

export function ApprovalCard({
  preview,
  busy,
  onDecide,
}: {
  preview: PendingPreview;
  busy: boolean;
  onDecide: (approved: boolean) => void;
}) {
  return (
    <Surface level="raised" className="rounded-control p-4">
      <p className="text-meta text-muted-foreground">
        Log this meal? Nothing is written until you confirm.
      </p>
      <div className="mt-3 space-y-1">
        <p className="text-body font-medium">
          {preview.name}
          {preview.portions === 1 ? null : (
            <span className="text-muted-foreground"> x{preview.portions}</span>
          )}
        </p>
        <p className="text-meta text-muted-foreground">
          {categoryLabel(preview.category)}
          {preview.place ? ` at ${preview.place}` : ""}
        </p>
        <MacroChips macros={preview} className="pt-1" />
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => onDecide(true)}
        >
          <Check className="size-4" strokeWidth={1.5} />
          Log it
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
