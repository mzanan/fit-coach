"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Surface } from "@/components/ui/Surface";
import { Textarea } from "@/components/ui/Textarea";
import { updateCoachRules } from "@/lib/actions/profile";
import { COACH_RULES_MAX } from "@/lib/constants";
import { useAction } from "@/hooks/useAction";

export function CoachRulesForm({ initial }: { initial: string | null }) {
  const { pending, run } = useAction();
  const [rules, setRules] = useState(initial ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);

  function save(next: string) {
    run(() => updateCoachRules({ rules: next }), {
      success: next.trim()
        ? "Coach rules saved"
        : "Back to the built-in coaching rules",
    });
  }

  return (
    <Surface className="p-card">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(rules);
        }}
        className="space-y-card"
      >
        <Textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder="Paste the markdown your coach wrote. It replaces the built-in macro and meal rules; the language, length and no-invented-data rules stay."
          rows={20}
          maxLength={COACH_RULES_MAX}
          className="min-h-[60vh] font-mono text-meta"
          aria-label="Coach rules"
        />
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save rules"}
          </Button>
          {initial ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmOpen(true)}
            >
              Use the built-in rules
            </Button>
          ) : null}
          <span className="ml-auto text-meta text-muted-foreground">
            {rules.length.toLocaleString()} / {COACH_RULES_MAX.toLocaleString()}{" "}
            chars
          </span>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Drop your coaching rules?"
        body="The coach goes back to the built-in macro and meal rules. What you pasted is deleted."
        confirmLabel="Drop them"
        tone="destructive"
        pending={pending}
        onConfirm={() => {
          setRules("");
          setConfirmOpen(false);
          save("");
        }}
      />
    </Surface>
  );
}
