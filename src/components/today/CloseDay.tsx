"use client";

import { useCloseDay } from "@/components/today/useCloseDay";
import { Button } from "@/components/ui/Button";
import { NumberField } from "@/components/ui/NumberField";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Surface } from "@/components/ui/Surface";
import { Textarea } from "@/components/ui/Textarea";
import type { Day } from "@/lib/db/schema";
import type { MacroLine } from "@/lib/macros";

export function CloseDay({
  day,
  dayRow,
  weeklyStepsAvg,
  deviations,
}: {
  day: string;
  dayRow: Day | null;
  weeklyStepsAvg: number | null;
  deviations: MacroLine[];
}) {
  const { steps, setSteps, notes, setNotes, pending, editing, setEditing, closed, save } =
    useCloseDay({ day, dayRow });

  if (closed && !editing) {
    return (
      <Surface level="raised" pad="compact">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-body font-medium">Day closed</p>
            <p className="text-meta text-muted-foreground">
              {dayRow?.steps != null ? `${dayRow.steps} steps` : "No steps logged"}
              {weeklyStepsAvg != null ? ` · weekly avg ${weeklyStepsAvg}` : ""}
            </p>
            {deviations.length ? (
              <p className="mt-1 text-meta text-brand-ink">
                {deviations.map((line) => line.key).join(", ")} outside target
              </p>
            ) : null}
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </Surface>
    );
  }

  return (
    <Surface level="raised">
      <SectionHeader title="Close the day" />
      <div className="space-y-3">
        <NumberField
          id="close-day-steps"
          label="Steps"
          value={steps}
          onChange={setSteps}
          min={0}
        />
        <Textarea
          size="sm"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button className="w-full" pending={pending} onClick={save}>
          {closed ? "Save changes" : "Close day"}
        </Button>
      </div>
    </Surface>
  );
}
