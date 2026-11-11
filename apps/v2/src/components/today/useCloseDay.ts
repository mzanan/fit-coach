"use client";

import { useState } from "react";

import { useAction } from "@/hooks/useAction";
import { closeDayAction } from "@/lib/actions/days";
import type { Day } from "@/lib/db/schema";

export function useCloseDay({ day, dayRow }: { day: string; dayRow: Day | null }) {
  const closed = dayRow?.closed_at != null;
  const [steps, setSteps] = useState(dayRow?.steps != null ? String(dayRow.steps) : "");
  const [notes, setNotes] = useState(dayRow?.notes ?? "");
  const [editing, setEditing] = useState(false);
  const { pending, run } = useAction();

  function save() {
    const parsedSteps = steps.trim() === "" ? null : Number(steps);
    run(
      () =>
        closeDayAction({
          day,
          steps: parsedSteps,
          notes: notes.trim() || null,
        }),
      {
        success: closed ? "Day updated" : "Day closed",
        onDone: () => setEditing(false),
      },
    );
  }

  return {
    steps,
    setSteps,
    notes,
    setNotes,
    pending,
    editing,
    setEditing,
    closed,
    save,
  };
}
