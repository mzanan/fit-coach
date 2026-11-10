"use client";

import { Checkbox } from "@/components/ui/Checkbox";
import type { PreviewBodyScan } from "@/components/import/useMdImport";
import { formatBodyScanMetrics } from "@/lib/importPreview";

export function ImportBodyScanRow({
  scan,
  onToggle,
}: {
  scan: PreviewBodyScan;
  onToggle: (include: boolean) => void;
}) {
  const metrics = formatBodyScanMetrics(scan);

  return (
    <div className="flex items-start gap-3 py-2.5">
      <Checkbox
        checked={scan.include}
        onChange={onToggle}
        aria-label={`Include InBody scan ${scan.taken_at}`}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <span className="text-body font-medium">{scan.taken_at}</span>
        {metrics.length ? (
          <p className="text-meta text-muted-foreground">
            {metrics.join(", ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
