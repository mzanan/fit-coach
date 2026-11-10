import type { ColumnPoint } from "@/components/ui/ColumnChart";
import { shortDay } from "@/lib/dates";
import type { MeasurementEntry } from "@/lib/data/bodyMeasurements";

export function toColumnPoints(
  entries: MeasurementEntry[],
  type: string,
): ColumnPoint[] {
  return entries
    .filter((entry) => entry.type === type)
    .slice()
    .sort((a, b) => a.logical_day.localeCompare(b.logical_day))
    .map((entry) => ({
      label: shortDay(entry.logical_day),
      value: entry.value,
    }));
}
