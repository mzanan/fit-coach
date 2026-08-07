"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Surface } from "@/components/ui/Surface";
import { Textarea } from "@/components/ui/Textarea";
import { useAction } from "@/hooks/useAction";

export function TextRulesForm({
  initial,
  action,
  maxLength,
  rows,
  minHeightClass,
  placeholder,
  ariaLabel,
  savedMessage,
  resetMessage,
  resetLabel,
  confirmTitle,
  confirmBody,
}: {
  initial: string | null;
  action: (input: { rules: string }) => Promise<unknown>;
  maxLength: number;
  rows: number;
  minHeightClass: string;
  placeholder: string;
  ariaLabel: string;
  savedMessage: string;
  resetMessage: string;
  resetLabel: string;
  confirmTitle: string;
  confirmBody: string;
}) {
  const { pending, run } = useAction();
  const [rules, setRules] = useState(initial ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);

  function save(next: string) {
    run(() => action({ rules: next }), {
      success: next.trim() ? savedMessage : resetMessage,
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
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className={`${minHeightClass} font-mono text-meta`}
          aria-label={ariaLabel}
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
              {resetLabel}
            </Button>
          ) : null}
          <span className="ml-auto text-meta text-muted-foreground">
            {rules.length.toLocaleString()} / {maxLength.toLocaleString()} chars
          </span>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        body={confirmBody}
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
