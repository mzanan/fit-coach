import { AlertCircle, Clock } from "lucide-react";

import { Surface } from "@/components/ui/Surface";
import type { ReminderItem } from "@/lib/reminders";
import { cn } from "@/lib/utils";

export function ReminderBanner({ reminders }: { reminders: ReminderItem[] }) {
  if (reminders.length === 0) return null;

  return (
    <Surface className="space-y-2 p-card">
      {reminders.map((reminder) => {
        const overdue = reminder.status === "overdue";
        const Icon = overdue ? AlertCircle : Clock;
        return (
          <div
            key={`${reminder.type}-${reminder.due_day}`}
            className="flex items-center gap-2"
          >
            <Icon
              className={cn(
                "size-4 shrink-0",
                overdue ? "text-destructive" : "text-muted-foreground",
              )}
              strokeWidth={1.5}
            />
            <p className="text-meta text-muted-foreground">
              {reminder.label}{" "}
              {overdue ? "is overdue" : `due ${reminder.due_day}`}
            </p>
          </div>
        );
      })}
    </Surface>
  );
}
