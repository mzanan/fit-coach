"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { MacroChips } from "@/components/ui/MacroChips";
import { Surface } from "@/components/ui/Surface";
import {
  categoryLabel,
  FATIGUE_TOOL,
  fatigueExtrasLabel,
  fatigueTimeLabel,
  MEASUREMENT_TOOL,
  measurementTypeLabel,
  measurementUnit,
  RULE_TOOL,
  WORKOUT_TOOL,
  WRITE_TOOL,
} from "@/lib/constants";
import type {
  LogFatiguePreview,
  LogMeasurementPreview,
  LogMealPreview,
  LogWorkoutSessionPreview,
  PendingPreview,
  UpdateRulePreview,
} from "@/lib/data/coachPendingWrite";
import { kcalOf } from "@/lib/macros";
import { cn, humanizeKey } from "@/lib/utils";
import { formatSetLine } from "@/lib/workoutHistory";

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

function isFatiguePreview(
  preview: PendingPreview,
): preview is LogFatiguePreview {
  return preview.toolName === FATIGUE_TOOL;
}

function isWorkoutPreview(
  preview: PendingPreview,
): preview is LogWorkoutSessionPreview {
  return preview.toolName === WORKOUT_TOOL;
}

function isMeasurementPreview(
  preview: PendingPreview,
): preview is LogMeasurementPreview {
  return preview.toolName === MEASUREMENT_TOOL;
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

interface PreviewKind {
  id: "meal" | "rule" | "fatigue" | "workout" | "measurement";
  count: number;
  question: { singular: string; plural: string };
  confirm: { singular: string; plural: string };
}

function activeKinds(kinds: PreviewKind[]): PreviewKind[] {
  return kinds.filter((k) => k.count > 0);
}

function promptFor(kinds: PreviewKind[], ambiguous: boolean): string {
  const tail = "Nothing is written until you confirm.";
  const active = activeKinds(kinds);
  if (active.length > 1) return `Confirm these changes? ${tail}`;
  const only = active[0];
  if (only?.id === "meal" && ambiguous) return `Which one? ${tail}`;
  if (only) {
    return `${only.count === 1 ? only.question.singular : only.question.plural} ${tail}`;
  }
  return `Log this meal? ${tail}`;
}

function confirmLabelFor(kinds: PreviewKind[]): string {
  const active = activeKinds(kinds);
  if (active.length > 1) return "Confirm";
  const only = active[0];
  if (only) return only.count === 1 ? only.confirm.singular : only.confirm.plural;
  return "Log it";
}

function RuleItem({ preview }: { preview: UpdateRulePreview }) {
  return (
    <div className="space-y-1">
      <p className="text-body font-medium">{humanizeKey(preview.key)}</p>
      <p className="text-meta text-muted-foreground">
        {preview.oldValue
          ? `${preview.oldValue} → ${preview.newValue}`
          : preview.newValue}
      </p>
    </div>
  );
}

function WorkoutItem({ preview }: { preview: LogWorkoutSessionPreview }) {
  return (
    <div className="space-y-1">
      <p className="text-body font-medium">{preview.label || "Workout"}</p>
      <div className="space-y-0.5">
        {preview.exercises.map((exercise, index) => (
          <p key={index} className="text-meta text-muted-foreground">
            {exercise.name}: {formatSetLine(exercise.sets)}
          </p>
        ))}
      </div>
    </div>
  );
}

function FatigueItem({ preview }: { preview: LogFatiguePreview }) {
  const extras = fatigueExtrasLabel(preview.sleepHours, preview.sleepLocation);
  return (
    <div className="space-y-1">
      <p className="text-body font-medium">
        {fatigueTimeLabel(preview.timeOfDay)} fatigue: {preview.score}/5
      </p>
      {extras ? <p className="text-meta text-muted-foreground">{extras}</p> : null}
      {preview.previousScore != null ? (
        <p className="text-meta text-muted-foreground">
          Was {preview.previousScore}/5 today
        </p>
      ) : null}
    </div>
  );
}

function MeasurementItem({ preview }: { preview: LogMeasurementPreview }) {
  const label = measurementTypeLabel(preview.type);
  const unit = measurementUnit(preview.type);
  return (
    <div className="space-y-1">
      <p className="text-body font-medium">
        {label}
        {preview.value != null ? `: ${preview.value}${unit}` : ""}
      </p>
      {preview.previousValue != null ? (
        <p className="text-meta text-muted-foreground">
          Was {preview.previousValue}
          {unit}
        </p>
      ) : null}
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
  const fatiguePreviews = previews.filter(isFatiguePreview);
  const workoutPreviews = previews.filter(isWorkoutPreview);
  const measurementPreviews = previews.filter(isMeasurementPreview);
  const firstMeal = mealPreviews[0];

  const options = firstMeal ? optionsOf(firstMeal) : [];
  const [chosenId, setChosenId] = useState(firstMeal?.itemId ?? "");

  if (!previews.length) return null;

  const ambiguous = Boolean(firstMeal?.itemId) && (firstMeal?.variants.length ?? 0) > 0;
  const chosenOption =
    options.find((option) => option.id === chosenId) ?? options[0];
  const displayedFirstMeal =
    firstMeal && chosenOption ? scaledOption(chosenOption, firstMeal.portions) : undefined;

  const kinds: PreviewKind[] = [
    {
      id: "meal",
      count: mealPreviews.length,
      question: { singular: "Log this meal?", plural: "Log these meals?" },
      confirm: { singular: "Log it", plural: "Log them" },
    },
    {
      id: "rule",
      count: rulePreviews.length,
      question: { singular: "Update this rule?", plural: "Update these rules?" },
      confirm: { singular: "Set it", plural: "Set them" },
    },
    {
      id: "fatigue",
      count: fatiguePreviews.length,
      question: {
        singular: "Log this fatigue check-in?",
        plural: "Log these fatigue check-ins?",
      },
      confirm: { singular: "Log it", plural: "Log them" },
    },
    {
      id: "workout",
      count: workoutPreviews.length,
      question: { singular: "Log this workout?", plural: "Log these workouts?" },
      confirm: { singular: "Log it", plural: "Log them" },
    },
    {
      id: "measurement",
      count: measurementPreviews.length,
      question: {
        singular: "Log this measurement?",
        plural: "Log these measurements?",
      },
      confirm: { singular: "Log it", plural: "Log them" },
    },
  ];

  const prompt = promptFor(kinds, ambiguous);
  const confirmLabel = confirmLabelFor(kinds);

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
          if (isFatiguePreview(preview)) {
            return (
              <FatigueItem key={`${preview.toolCallId}-${index}`} preview={preview} />
            );
          }
          if (isWorkoutPreview(preview)) {
            return (
              <WorkoutItem key={`${preview.toolCallId}-${index}`} preview={preview} />
            );
          }
          if (isMeasurementPreview(preview)) {
            return (
              <MeasurementItem
                key={`${preview.toolCallId}-${index}`}
                preview={preview}
              />
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
