"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { MacroChips } from "@/components/ui/MacroChips";
import { Surface } from "@/components/ui/Surface";
import { categoryLabel } from "@/lib/constants";
import type { PendingPreview } from "@/lib/data/coachPendingWrite";
import { cn } from "@/lib/utils";

function SizePicker({
  preview,
  chosen,
  onChoose,
}: {
  preview: PendingPreview;
  chosen: string;
  onChoose: (id: string) => void;
}) {
  const options = [
    { id: preview.itemId, name: preview.name },
    ...preview.variants,
  ];

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChoose(option.id)}
          className={cn(
            "rounded-control border px-2.5 py-1 text-meta transition-colors duration-(--dur-fast)",
            option.id === chosen
              ? "border-ring bg-well text-foreground"
              : "border-input text-muted-foreground hover:text-foreground",
          )}
        >
          {option.name}
        </button>
      ))}
    </div>
  );
}

export function ApprovalCard({
  previews,
  busy,
  onDecide,
}: {
  previews: PendingPreview[];
  busy: boolean;
  onDecide: (approved: boolean, itemId?: string) => void;
}) {
  const first = previews[0];
  const [chosen, setChosen] = useState(first?.itemId ?? "");

  if (!first) return null;

  const ambiguous = Boolean(first.itemId) && first.variants?.length > 0;

  return (
    <Surface level="raised" className="rounded-control p-4">
      <p className="text-meta text-muted-foreground">
        {ambiguous
          ? "Which one? Nothing is written until you confirm."
          : `${previews.length === 1 ? "Log this meal?" : "Log these meals?"} Nothing is written until you confirm.`}
      </p>
      <div className="mt-3 space-y-4">
        {previews.map((preview, index) => (
          <div key={`${preview.itemId}-${index}`} className="space-y-1">
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
            {index === 0 && ambiguous ? (
              <SizePicker
                preview={preview}
                chosen={chosen}
                onChoose={setChosen}
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() =>
            onDecide(true, chosen === first.itemId ? undefined : chosen)
          }
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
