import { addDays, format, parseISO, subHours } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import { DAY_CUTOFF_DEFAULT, TIMEZONE_DEFAULT } from "@/lib/constants";

export interface DayConfig {
  timezone: string;
  cutoffHour: number;
}

export function dayConfig(profile?: {
  timezone?: string | null;
  day_cutoff_hour?: number | null;
}): DayConfig {
  return {
    timezone: profile?.timezone ?? TIMEZONE_DEFAULT,
    cutoffHour: profile?.day_cutoff_hour ?? DAY_CUTOFF_DEFAULT,
  };
}

export function logicalDayOf(date: Date, cfg: DayConfig): string {
  const zoned = toZonedTime(date, cfg.timezone);
  const shifted = subHours(zoned, cfg.cutoffHour);
  return format(shifted, "yyyy-MM-dd");
}

export function todayLogicalDay(cfg: DayConfig): string {
  return logicalDayOf(new Date(), cfg);
}

export function shiftDay(day: string, deltaDays: number): string {
  return format(addDays(parseISO(day), deltaDays), "yyyy-MM-dd");
}

export function isGymWeekday(day: string): boolean {
  const weekday = parseISO(day).getDay();
  return weekday === 1 || weekday === 2 || weekday === 4 || weekday === 5;
}

export function formatDayLabel(day: string, todayDay: string): string {
  if (day === todayDay) return "Today";
  if (day === shiftDay(todayDay, -1)) return "Yesterday";
  if (day === shiftDay(todayDay, 1)) return "Tomorrow";
  return format(parseISO(day), "EEE, MMM d");
}
