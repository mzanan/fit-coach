"use client";

import { useState } from "react";

import { ColumnChart } from "@/components/ui/ColumnChart";
import { Segmented } from "@/components/ui/Segmented";
import { Surface } from "@/components/ui/Surface";
import type { MeasurementEntry } from "@/lib/data/bodyMeasurements";
import { toColumnPoints } from "@/lib/measurementChart";

const METRICS = [
  { value: "waist", label: "Waist", unit: "cm" },
  { value: "weight", label: "Weight", unit: "kg" },
] as const;

export function MeasurementsChart({
  entries,
}: {
  entries: MeasurementEntry[];
}) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["value"]>(
    "waist",
  );
  const active = METRICS.find((m) => m.value === metric) ?? METRICS[0];
  const points = toColumnPoints(entries, metric);

  return (
    <Surface className="p-card">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Trend</p>
        <Segmented
          size="md"
          ariaLabel="Metric"
          options={METRICS}
          value={metric}
          onChange={(v) => setMetric(v as typeof metric)}
          className="max-w-[220px]"
        />
      </div>

      <div className="mt-4">
        {points.length === 0 ? (
          <p className="text-meta text-muted-foreground">
            No {active.label.toLowerCase()} entries yet.
          </p>
        ) : (
          <ColumnChart
            points={points}
            unit={active.unit}
            ariaLabel={`${active.label} trend over the last ${points.length} entries`}
          />
        )}
      </div>
    </Surface>
  );
}
