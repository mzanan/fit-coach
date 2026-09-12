import { addDays, format, parseISO, subHours } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

import {
  DAY_CUTOFF_DEFAULT,
  TIMEZONE_DEFAULT,
  type MealCategoryKey,
} from "@/lib/constants";

export interface DayConfig {
  timezone: string;
  cutoffHour: number;
}

export function isValidTimezone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export function dayConfig(profile?: {
  timezone?: string | null;
  day_cutoff_hour?: number | null;
}): DayConfig {
  const saved = profile?.timezone;
  return {
    timezone: saved && isValidTimezone(saved) ? saved : TIMEZONE_DEFAULT,
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

export function weekdayOf(day: string): number {
  return parseISO(day).getDay();
}

export function isGymWeekday(day: string): boolean {
  const weekday = weekdayOf(day);
  return weekday === 1 || weekday === 2 || weekday === 4 || weekday === 5;
}

export function daysSinceMonday(day: string): number {
  const weekday = weekdayOf(day);
  return (weekday + 6) % 7;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function shortDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return WEEKDAY_LABELS[d.getUTCDay()] ?? "";
}

export function formatDayLabel(day: string, todayDay: string): string {
  if (day === todayDay) return "Today";
  if (day === shiftDay(todayDay, -1)) return "Yesterday";
  if (day === shiftDay(todayDay, 1)) return "Tomorrow";
  return format(parseISO(day), "EEE, MMM d");
}

export function inferMealCategory(
  now: Date,
  cfg: DayConfig,
  isGymDay: boolean,
): MealCategoryKey {
  const zoned = toZonedTime(now, cfg.timezone);
  const minutes = zoned.getHours() * 60 + zoned.getMinutes();
  const cutoff = Math.min(cfg.cutoffHour, 6) * 60;

  if (minutes < cutoff) return "dinner";
  if (minutes < 9 * 60) return "breakfast";
  if (minutes < 11 * 60 + 30) return isGymDay ? "post_gym" : "breakfast";
  if (minutes < 16 * 60) return "lunch";
  if (minutes < 18 * 60) return "snack";
  return "dinner";
}

export interface CurrentTime {
  timezone: string;
  date: string;
  time: string;
  weekday: string;
  logical_day: string;
}

export function currentTimeFor(
  profile: { timezone?: string | null; day_cutoff_hour?: number | null },
  logicalDay: string,
  now: Date = new Date(),
): CurrentTime {
  const { timezone } = dayConfig(profile);
  return {
    timezone,
    date: formatInTimeZone(now, timezone, "yyyy-MM-dd"),
    time: formatInTimeZone(now, timezone, "HH:mm"),
    weekday: formatInTimeZone(now, timezone, "EEEE"),
    logical_day: logicalDay,
  };
}
