"use client";

import type { DuplicateScan } from "@/components/settings/useInbodyImport";
import { Button } from "@/components/ui/Button";
import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";

function line(
  label: string,
  weight: number | null,
  muscle: number | null,
  fat: number | null,
) {
  const parts = [
    weight != null ? `${weight} kg` : null,
    muscle != null ? `${muscle} kg muscle` : null,
    fat != null ? `${fat} % fat` : null,
  ].filter(Boolean);
  return `${label}: ${parts.length ? parts.join(", ") : "no values"}`;
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
      description={`A scan from ${takenAt} already exists. Replace it with the one you just imported, or keep both.`}
    >
      {duplicate && (
        <div className="space-y-4">
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>
              {line(
                "Saved",
                duplicate.existing.weight_kg,
                duplicate.existing.skeletal_muscle_kg,
                duplicate.existing.body_fat_pct,
              )}
            </li>
            <li>
              {line(
                "Imported now",
                duplicate.pending.weight_kg,
                duplicate.pending.skeletal_muscle_kg,
                duplicate.pending.body_fat_pct,
              )}
            </li>
          </ul>
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
