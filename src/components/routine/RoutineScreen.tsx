"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Label } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { ToggleChip } from "@/components/ui/ToggleChip";
import { RoutineExerciseList } from "@/components/routine/RoutineExerciseList";
import { useRoutineSlot } from "@/components/routine/useRoutineSlot";
import { DEFAULT_SPLIT } from "@/lib/constants";
import { WEEKDAY_LABELS } from "@/lib/dates";
import type { RoutineExercise, RoutineSlot } from "@/lib/db/schema";

const WEEKDAY_OPTIONS = WEEKDAY_LABELS.map((label, value) => ({
  value: String(value),
  label,
}));

export function RoutineScreen({
  slots,
  exercisesByLabel,
  todayWeekday,
}: {
  slots: RoutineSlot[];
  exercisesByLabel: Record<string, RoutineExercise[]>;
  todayWeekday: number;
}) {
  const { weekday, setWeekday, slot, pending, saveLabel, removeSlot } =
    useRoutineSlot(slots, todayWeekday);
  const [draft, setDraft] = useState(() => ({
    weekday,
    label: slot?.label ?? "",
  }));
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (draft.weekday !== weekday) {
    setDraft({ weekday, label: slot?.label ?? "" });
  }

  const labelDraft = draft.label;
  function setLabelDraft(value: string) {
    setDraft({ weekday, label: value });
  }

  const trimmedDraft = labelDraft.trim();
  const dirty = trimmedDraft !== "" && trimmedDraft !== (slot?.label ?? "");
  const exercises = slot ? (exercisesByLabel[slot.label] ?? []) : [];

  return (
    <div className="space-y-block">
      <Segmented
        ariaLabel="Weekday"
        options={WEEKDAY_OPTIONS}
        value={String(weekday)}
        onChange={(v) => setWeekday(Number(v))}
      />

      <div>
        <Label htmlFor="routine-label">Split label</Label>
        <div className="flex gap-2">
          <Input
            id="routine-label"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            placeholder="e.g. Upper A"
          />
          <Button disabled={pending || !dirty} onClick={() => saveLabel(labelDraft)}>
            Save
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEFAULT_SPLIT.map((label) => (
            <ToggleChip
              key={label}
              size="sm"
              pressedState={labelDraft === label}
              onPressedChange={() => setLabelDraft(label)}
            >
              {label}
            </ToggleChip>
          ))}
        </div>
        {slot ? (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-destructive"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
            Remove this day
          </Button>
        ) : null}
      </div>

      {slot ? (
        <RoutineExerciseList label={slot.label} exercises={exercises} />
      ) : (
        <EmptyState
          size="sm"
          title="No split assigned to this day"
          body="Pick or type a label above and save it to start adding exercises."
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove this day?"
        body="This clears the split label for this weekday. Its exercises stay saved for any other day using the same label."
        confirmLabel="Remove"
        tone="destructive"
        pending={pending}
        onConfirm={removeSlot}
      />
    </div>
  );
}
