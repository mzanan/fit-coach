"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { MacroChips } from "@/components/ui/MacroChips";
import { Surface } from "@/components/ui/Surface";
import { categoryLabel } from "@/lib/constants";
import type { PendingPreview } from "@/lib/data/coachPendingWrite";
import { kcalOf } from "@/lib/macros";
import { cn } from "@/lib/utils";

interface DisplayOption {
  id: string;
  name: string;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  kcal: number;
}

function optionsOf(preview: PendingPreview): DisplayOption[] {
  const portions = preview.portions || 1;
  return [
    {
      id: preview.itemId,
      name: preview.name,
      protein_g: preview.protein_g / portions,
      fat_g: preview.fat_g / portions,
      carbs_g: preview.carbs_g / portions,
      kcal: preview.kcal / portions,
    },
    ...preview.variants,
  ];
}

function scaledOption(option: DisplayOption, portions: number): DisplayOption {
  if (portions === 1) return option;
  const scaled = {
    protein_g: Math.round(option.protein_g * portions),
    fat_g: Math.round(option.fat_g * portions),
    carbs_g: Math.round(option.carbs_g * portions),
  };
  return {
    ...option,
    ...scaled,
    kcal: Math.round(kcalOf(scaled)),
  };
}

function SizePicker({
  options,
  chosenId,
  onChoose,
}: {
  options: DisplayOption[];
  chosenId: string;
  onChoose: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChoose(option.id)}
          className={cn(
            "rounded-control border px-2.5 py-1 text-meta transition-colors duration-(--dur-fast)",
            option.id === chosenId
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
  const options = first ? optionsOf(first) : [];
  const [chosenId, setChosenId] = useState(first?.itemId ?? "");

  if (!first) return null;

  const ambiguous = Boolean(first.itemId) && first.variants.length > 0;
  const chosenOption =
    options.find((option) => option.id === chosenId) ?? options[0];
  const displayed = scaledOption(chosenOption, first.portions);

  return (
    <Surface level="raised" className="rounded-control p-4">
      <p className="text-meta text-muted-foreground">
        {ambiguous
          ? "Which one? Nothing is written until you confirm."
          : `${previews.length === 1 ? "Log this meal?" : "Log these meals?"} Nothing is written until you confirm.`}
      </p>
      <div className="mt-3 space-y-4">
        {previews.map((preview, index) => {
          const shown = index === 0 ? displayed : preview;
          return (
            <div key={`${preview.itemId}-${index}`} className="space-y-1">
              <p className="text-body font-medium">
                {shown.name}
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
              <MacroChips macros={shown} className="pt-1" />
              {index === 0 && ambiguous ? (
                <SizePicker
                  options={options}
                  chosenId={chosenId}
                  onChoose={setChosenId}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() =>
            onDecide(true, chosenId === first.itemId ? undefined : chosenId)
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
