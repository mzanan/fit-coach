import { Surface } from "@/components/ui/Surface";
import { measurementTypeLabel, measurementUnit } from "@/lib/constants";
import type { MeasurementEntry } from "@/lib/data/bodyMeasurements";
import { formatDayLabel } from "@/lib/dates";

export function MeasurementHistory({
  entries,
  today,
}: {
  entries: MeasurementEntry[];
  today: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-meta text-muted-foreground">
        No measurements logged yet.
      </p>
    );
  }

  return (
    <Surface radius="xl" className="divide-y divide-border">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between gap-3 px-card py-3"
        >
          <div className="min-w-0">
            <p className="text-body">{measurementTypeLabel(entry.type)}</p>
            <p className="text-meta text-muted-foreground">
              {formatDayLabel(entry.logical_day, today)}
            </p>
          </div>
          <span className="shrink-0 text-body font-medium">
            {entry.value != null
              ? `${entry.value} ${measurementUnit(entry.type)}`
              : "-"}
          </span>
        </div>
      ))}
    </Surface>
  );
}
