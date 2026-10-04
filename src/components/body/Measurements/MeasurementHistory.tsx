import { EmptyState } from "@/components/ui/EmptyState";
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
      <EmptyState
        size="sm"
        title="No measurements yet"
        body="Log waist or weight above and the trend fills in."
      />
    );
  }

  return (
    <Surface list>
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
          <span className="num shrink-0 text-body font-medium">
            {entry.value != null
              ? `${entry.value} ${measurementUnit(entry.type)}`
              : "-"}
          </span>
        </div>
      ))}
    </Surface>
  );
}
