import { isGymWeekday, weekdayOf } from "@/lib/dates";

export type DayType = "gym" | "rest";

export interface DaySlotWeekday {
  weekday: number;
}

export interface ResolveDayTypeInput {
  dayRow: { day_type: string } | null | undefined;
  slots: DaySlotWeekday[];
  day: string;
}

export function resolveDayType(input: ResolveDayTypeInput): DayType {
  if (input.dayRow?.day_type === "gym" || input.dayRow?.day_type === "rest") {
    return input.dayRow.day_type;
  }
  if (input.slots.length === 0) {
    return isGymWeekday(input.day) ? "gym" : "rest";
  }
  const weekday = weekdayOf(input.day);
  return input.slots.some((slot) => slot.weekday === weekday) ? "gym" : "rest";
}
