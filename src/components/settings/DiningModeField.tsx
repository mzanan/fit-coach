"use client";

import { useState } from "react";

import { Segmented } from "@/components/ui/Segmented";
import { Surface } from "@/components/ui/Surface";
import { updateDiningMode } from "@/lib/actions/profile";
import { useAction } from "@/hooks/useAction";

const OPTIONS = [
  { value: "delivery", label: "Orders delivery" },
  { value: "cooks", label: "Also cooks" },
];

export function DiningModeField({ initial }: { initial: string | null }) {
  const { pending, run } = useAction();
  const [mode, setMode] = useState(initial ?? "");

  return (
    <Surface className="p-card">
      <p className="text-body font-medium">Kitchen</p>
      <p className="mt-0.5 mb-card text-meta text-muted-foreground">
        Whether the coach may suggest cooking, or must stay inside your
        catalog. Asked once in the chat; change it here.
      </p>
      <Segmented
        options={OPTIONS}
        value={mode}
        ariaLabel="Kitchen"
        onChange={(next) => {
          if (pending || next === mode) return;
          setMode(next);
          run(() => updateDiningMode({ mode: next as "delivery" | "cooks" }), {
            success: "Saved",
          });
        }}
      />
    </Surface>
  );
}
