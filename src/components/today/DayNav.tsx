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
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Previous day"
        onClick={() => go(shiftDay(day, -1))}
      >
        <ChevronLeft className="size-5" />
      </Button>
      <div className="flex flex-col items-center">
        <span className="text-title font-medium tracking-(--tracking-snug) lg:text-h1-lg">
          {formatDayLabel(day, today)}
        </span>
        <Pill tone={isGymDay ? "brand" : "muted"} className="mt-0.5">
          {isGymDay ? "Gym day" : "Rest day"}
        </Pill>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Next day"
        disabled={day >= today}
        onClick={() => go(shiftDay(day, 1))}
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
