"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { MacroChips } from "@/components/ui/MacroChips";
import { Surface } from "@/components/ui/Surface";
import { categoryLabel, RULE_TOOL, WRITE_TOOL } from "@/lib/constants";
import type {
  LogMealPreview,
  PendingPreview,
  UpdateRulePreview,
} from "@/lib/data/coachPendingWrite";
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

interface MacroShape {
  name: string;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  kcal: number;
}

function isMealPreview(preview: PendingPreview): preview is LogMealPreview {
  return preview.toolName === WRITE_TOOL;
}

function isRulePreview(preview: PendingPreview): preview is UpdateRulePreview {
  return preview.toolName === RULE_TOOL;
}

function weightOf(name: string): number {
  const match = /^\s*([\d.,]+)/.exec(name);
  return match ? parseFloat(match[1].replace(",", ".")) : Number.MAX_SAFE_INTEGER;
}

function optionsOf(preview: LogMealPreview): DisplayOption[] {
  const portions = preview.portions || 1;
  const options = [
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
  return options.sort((a, b) => weightOf(a.name) - weightOf(b.name));
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

function MealItem({
  preview,
  shown,
}: {
  preview: LogMealPreview;
  shown: MacroShape;
}) {
  return (
    <div className="space-y-1">
      <p className="text-body font-medium">
        {shown.name}
        {preview.portions === 1 ? null : (
          <span className="text-muted-foreground"> x{preview.portions}</span>
        )}
      </p>
      <p className="text-meta text-muted-foreground">
        {categoryLabel(preview.category)}
        {preview.place ? ` at ${preview.place}` : ""}
      </p>
      <MacroChips macros={shown} className="pt-1" />
    </div>
  );
}

function promptFor(
  mealCount: number,
  ruleCount: number,
  ambiguous: boolean,
): string {
  const tail = "Nothing is written until you confirm.";
  if (mealCount && ruleCount) return `Confirm these changes? ${tail}`;
  if (ruleCount) {
    return `${ruleCount === 1 ? "Update this rule?" : "Update these rules?"} ${tail}`;
  }
  if (ambiguous) return `Which one? ${tail}`;
  return `${mealCount === 1 ? "Log this meal?" : "Log these meals?"} ${tail}`;
}

function confirmLabelFor(mealCount: number, ruleCount: number): string {
  if (mealCount && ruleCount) return "Confirm";
  if (ruleCount) return ruleCount === 1 ? "Set it" : "Set them";
  return mealCount === 1 ? "Log it" : "Log them";
}

function RuleItem({ preview }: { preview: UpdateRulePreview }) {
  return (
    <div className="space-y-1">
      <p className="text-body font-medium">{preview.key}</p>
      <p className="text-meta text-muted-foreground">
        {preview.oldValue
          ? `${preview.oldValue} → ${preview.newValue}`
          : preview.newValue}
      </p>
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
  const mealPreviews = previews.filter(isMealPreview);
  const rulePreviews = previews.filter(isRulePreview);
  const firstMeal = mealPreviews[0];

  const options = firstMeal ? optionsOf(firstMeal) : [];
  const [chosenId, setChosenId] = useState(firstMeal?.itemId ?? "");

  if (!previews.length) return null;

  const ambiguous = Boolean(firstMeal?.itemId) && (firstMeal?.variants.length ?? 0) > 0;
  const chosenOption =
    options.find((option) => option.id === chosenId) ?? options[0];
  const displayedFirstMeal =
    firstMeal && chosenOption ? scaledOption(chosenOption, firstMeal.portions) : undefined;

  const prompt = promptFor(mealPreviews.length, rulePreviews.length, ambiguous);
  const confirmLabel = confirmLabelFor(
    mealPreviews.length,
    rulePreviews.length,
  );

  return (
    <Surface level="raised" className="rounded-control p-4">
      <p className="text-meta text-muted-foreground">{prompt}</p>
      <div className="mt-3 space-y-4">
        {previews.map((preview, index) => {
          if (isRulePreview(preview)) {
            return (
              <RuleItem key={`${preview.toolCallId}-${index}`} preview={preview} />
            );
          }
          const isFirstMeal = preview === firstMeal;
          const shown = isFirstMeal && displayedFirstMeal ? displayedFirstMeal : preview;
          return (
            <div key={`${preview.toolCallId}-${index}`}>
              <MealItem preview={preview} shown={shown} />
              {isFirstMeal && ambiguous ? (
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
            onDecide(
              true,
              !firstMeal || chosenId === firstMeal.itemId ? undefined : chosenId,
            )
          }
        >
          <Check className="size-4" strokeWidth={1.5} />
          {confirmLabel}
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
