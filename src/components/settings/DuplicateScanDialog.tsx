"use client";

import type { DuplicateScan } from "@/components/settings/useInbodyImport";
import { Button } from "@/components/ui/Button";
import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";
import { Surface } from "@/components/ui/Surface";

function lines(weight: number | null, muscle: number | null, fat: number | null) {
  return [
    weight != null ? `${weight} kg` : "--",
    muscle != null ? `${muscle} kg muscle` : "--",
    fat != null ? `${fat} % fat` : "--",
  ];
}

export function DuplicateScanDialog({
  duplicate,
  busy,
  onResolve,
  onCancel,
}: {
  duplicate: DuplicateScan | null;
  busy: boolean;
  onResolve: (mode: "replace" | "new") => void;
  onCancel: () => void;
}) {
  const takenAt = duplicate?.pending.taken_at.replace("T", " ") ?? "";

  return (
    <ResponsiveDialog
      open={duplicate !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title="This scan is already saved"
      description={`A scan from ${takenAt} already exists.\nReplace it with the one you just imported, or keep both.`}
    >
      {duplicate && (
        <div className="space-y-card">
          <Surface level="sunken" className="grid grid-cols-2 gap-4 p-card">
            <div>
              <p className="eyebrow">Saved</p>
              <ul className="mt-2 space-y-1 text-meta text-muted-foreground">
                {lines(
                  duplicate.existing.weight_kg,
                  duplicate.existing.skeletal_muscle_kg,
                  duplicate.existing.body_fat_pct,
                ).map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow">Imported now</p>
              <ul className="mt-2 space-y-1 text-meta text-muted-foreground">
                {lines(
                  duplicate.pending.weight_kg,
                  duplicate.pending.skeletal_muscle_kg,
                  duplicate.pending.body_fat_pct,
                ).map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          </Surface>
          <div className="grid gap-2">
            <Button disabled={busy} onClick={() => onResolve("replace")}>
              Replace the saved one
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => onResolve("new")}
            >
              Keep both, save as new
            </Button>
            <Button variant="ghost" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
