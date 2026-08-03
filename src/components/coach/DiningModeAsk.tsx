"use client";

import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { updateDiningMode } from "@/lib/actions/profile";
import { useAction } from "@/hooks/useAction";

export function DiningModeAsk() {
  const { pending, run } = useAction();

  function answer(mode: "delivery" | "cooks") {
    run(() => updateDiningMode({ mode }), {
      success: "Saved. Change it anytime in Settings > Coach rules.",
    });
  }

  return (
    <Surface className="mb-block p-card">
      <p className="text-body font-medium">One question before we start</p>
      <p className="mt-0.5 text-meta text-muted-foreground">
        Do you cook at home, or do you order from your saved catalog? The coach
        keeps this as a standing rule until you change it.
      </p>
      <div className="mt-card grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => answer("delivery")}
        >
          I order delivery
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => answer("cooks")}
        >
          I also cook
        </Button>
      </div>
    </Surface>
  );
}
