"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { MacroChips } from "@/components/ui/MacroChips";
import { Surface } from "@/components/ui/Surface";
import {
  categoryLabel,
  fatigueExtrasLabel,
  fatigueTimeLabel,
  measurementTypeLabel,
  measurementUnit,
} from "@/lib/constants";
import type {
  CloseDayPreview,
  LogFatiguePreview,
  LogMeasurementPreview,
  LogMealPreview,
  LogWorkoutSessionPreview,
  PendingPreview,
  UpdateRulePreview,
} from "@/lib/data/coachPendingWrite";
import {
  confirmLabelFor,
  isCloseDayPreview,
  isFatiguePreview,
  isMealPreview,
  isMeasurementPreview,
  isRulePreview,
  isWorkoutPreview,
  optionsOf,
  promptFor,
  scaledOption,
} from "@/lib/approvalPreview";
import type { DisplayOption, PreviewKind } from "@/lib/approvalPreview";
import { cn, humanizeKey } from "@/lib/utils";
import { formatSetLine } from "@/lib/workoutHistory";

interface MacroShape {
  name: string;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  kcal: number;
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
        {fatigueTimeLabel(preview.timeOfDay)}
        {preview.score != null ? ` fatigue: ${preview.score}/5` : " sleep (energy pending)"}
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

function CloseDayItem({ preview }: { preview: CloseDayPreview }) {
  return (
    <div className="space-y-1">
      <p className="text-body font-medium">Close day: {preview.steps} steps</p>
      {preview.notes ? (
        <p className="text-meta text-muted-foreground">{preview.notes}</p>
      ) : null}
      {preview.previousSteps != null ? (
        <p className="text-meta text-muted-foreground">
          Was {preview.previousSteps} steps
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
  const closeDayPreviews = previews.filter(isCloseDayPreview);
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
    {
      id: "close_day",
      count: closeDayPreviews.length,
      question: { singular: "Close the day?", plural: "Close these days?" },
      confirm: { singular: "Close it", plural: "Close them" },
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
          if (isCloseDayPreview(preview)) {
            return (
              <CloseDayItem key={`${preview.toolCallId}-${index}`} preview={preview} />
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
