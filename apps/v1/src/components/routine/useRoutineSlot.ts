"use client";

import { useState } from "react";

import { deleteSlotAction, saveSlotAction } from "@/lib/actions/routine";
import type { RoutineSlot } from "@/lib/db/schema";
import { useAction } from "@/hooks/useAction";

export function useRoutineSlot(slots: RoutineSlot[], initialWeekday: number) {
  const [weekday, setWeekday] = useState(initialWeekday);
  const { pending, run } = useAction();
  const slot = slots.find((s) => s.weekday === weekday) ?? null;

  function saveLabel(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    run(() => saveSlotAction({ weekday, label: trimmed }), {
      success: "Day saved",
    });
  }

  function removeSlot() {
    run(() => deleteSlotAction({ weekday }), { success: "Day removed" });
  }

  return { weekday, setWeekday, slot, pending, saveLabel, removeSlot };
}
