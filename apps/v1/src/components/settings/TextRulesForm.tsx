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
  size,
  mono,
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
  size?: "md" | "editor";
  mono?: boolean;
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
    <Surface>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(rules);
        }}
      >
        <Textarea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          size={size}
          mono={mono}
          aria-label={ariaLabel}
        />
        <p className="mt-1.5 text-right text-meta text-faint num">
          {rules.length.toLocaleString()} / {maxLength.toLocaleString()} chars
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit" pending={pending}>
            Save rules
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
