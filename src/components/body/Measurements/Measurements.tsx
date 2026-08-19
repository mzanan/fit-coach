import { MeasurementForm } from "@/components/body/Measurements/MeasurementForm";
import { MeasurementHistory } from "@/components/body/Measurements/MeasurementHistory";
import { MeasurementsChart } from "@/components/body/Measurements/MeasurementsChart";
import { ReminderBanner } from "@/components/body/Measurements/ReminderBanner";
import type { MeasurementEntry } from "@/lib/data/bodyMeasurements";
import type { ReminderItem } from "@/lib/reminders";

export function Measurements({
  entries,
  reminders,
  today,
}: {
  entries: MeasurementEntry[];
  reminders: ReminderItem[];
  today: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-title font-medium tracking-(--tracking-snug)">
          Measurements
        </h2>
      </div>

      <ReminderBanner reminders={reminders} />
      <MeasurementForm />
      <MeasurementsChart entries={entries} />
      <MeasurementHistory entries={entries} today={today} />
    </div>
  );
}
