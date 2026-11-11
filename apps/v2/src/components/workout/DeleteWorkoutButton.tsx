"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteWorkout } from "@/lib/actions/workouts";
import { useAction } from "@/hooks/useAction";

export function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { pending, run } = useAction();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete session"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-[18px]" strokeWidth={1.5} />
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this session?"
        body="Every exercise and set logged today goes with it."
        confirmLabel="Delete"
        tone="destructive"
        pending={pending}
        onConfirm={() => run(() => deleteWorkout(workoutId))}
      />
    </>
  );
}
