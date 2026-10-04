"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { formatDayLabel, shiftDay } from "@/lib/dates";

export function DayNav({
  day,
  today,
  isGymDay,
}: {
  day: string;
  today: string;
  isGymDay: boolean;
}) {
  const router = useRouter();
  const go = (target: string) => {
    if (target === today) router.push("/");
    else router.push(`/?day=${target}`);
  };

  return (
    <div className="flex items-end gap-3">
      <div className="min-w-0 flex-1">
        <Pill tone={isGymDay ? "brand" : "muted"} variant={isGymDay ? "solid" : "soft"}>
          {isGymDay ? "Gym day" : "Rest day"}
        </Pill>
        <h1 className="mt-2.5 truncate text-h1 font-semibold">
          {formatDayLabel(day, today)}
        </h1>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous day"
          onClick={() => go(shiftDay(day, -1))}
        >
          <ChevronLeft className="size-5" strokeWidth={1.75} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next day"
          disabled={day >= today}
          onClick={() => go(shiftDay(day, 1))}
        >
          <ChevronRight className="size-5" strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  );
}
