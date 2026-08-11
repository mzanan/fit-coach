import "server-only";

import { getLatestMeasurement } from "@/lib/data/bodyMeasurements";
import { getLatestScanTakenAt } from "@/lib/data/bodyScans";
import { getActiveRule, listActiveRules } from "@/lib/data/coachRules";
import { logicalDayOf, shiftDay, type DayConfig } from "@/lib/dates";
import { humanizeKey } from "@/lib/utils";

export type ReminderStatus = "overdue" | "upcoming";

export interface ReminderItem {
  type: string;
  label: string;
  status: ReminderStatus;
  due_day: string;
  last_day: string | null;
}

const UPCOMING_WINDOW_DAYS = 3;
const TREATMENT_END_SUFFIX = "_end_date";
const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

const CADENCE_DEFS = [
  {
    type: "photo",
    label: "Progress photo",
    ruleKey: "photo_reminder_days",
    defaultDays: 28 as number | null,
  },
  {
    type: "waist",
    label: "Waist measurement",
    ruleKey: "waist_reminder_days",
    defaultDays: 14 as number | null,
  },
  {
    type: "inbody",
    label: "InBody scan",
    ruleKey: "inbody_reminder_days",
    defaultDays: null as number | null,
  },
] as const;

function cadenceDaysOf(
  raw: string | undefined,
  fallback: number | null,
): number | null {
  const parsed = raw != null ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
}

function cadenceReminder(
  type: string,
  label: string,
  lastDay: string | null,
  cadenceDays: number,
  today: string,
): ReminderItem | null {
  if (!lastDay) return null;
  const dueDay = shiftDay(lastDay, cadenceDays);
  if (dueDay > shiftDay(today, UPCOMING_WINDOW_DAYS)) return null;
  return {
    type,
    label,
    status: dueDay <= today ? "overdue" : "upcoming",
    due_day: dueDay,
    last_day: lastDay,
  };
}

function treatmentEndReminders(
  rules: { key: string; value: string }[],
  today: string,
): ReminderItem[] {
  return rules.flatMap((rule) => {
    if (!rule.key.endsWith(TREATMENT_END_SUFFIX)) return [];
    const dueDay = rule.value.trim();
    if (!DATE_SHAPE.test(dueDay)) return [];
    if (dueDay > shiftDay(today, UPCOMING_WINDOW_DAYS)) return [];
    return [
      {
        type: "treatment_end",
        label: humanizeKey(rule.key.slice(0, -TREATMENT_END_SUFFIX.length)),
        status: (dueDay <= today ? "overdue" : "upcoming") as ReminderStatus,
        due_day: dueDay,
        last_day: null,
      },
    ];
  });
}

export async function getUpcomingReminders(
  userId: string,
  cfg: DayConfig,
  today: string,
): Promise<ReminderItem[]> {
  const [photoRule, waistRule, inbodyRule, allRules, lastPhoto, lastWaist, lastScan] =
    await Promise.all([
      getActiveRule(userId, CADENCE_DEFS[0].ruleKey),
      getActiveRule(userId, CADENCE_DEFS[1].ruleKey),
      getActiveRule(userId, CADENCE_DEFS[2].ruleKey),
      listActiveRules(userId),
      getLatestMeasurement(userId, "photo"),
      getLatestMeasurement(userId, "waist"),
      getLatestScanTakenAt(userId),
    ]);

  const cadenceInputs = [
    { def: CADENCE_DEFS[0], rule: photoRule, lastDay: lastPhoto?.logical_day ?? null },
    { def: CADENCE_DEFS[1], rule: waistRule, lastDay: lastWaist?.logical_day ?? null },
    {
      def: CADENCE_DEFS[2],
      rule: inbodyRule,
      lastDay: lastScan ? logicalDayOf(lastScan, cfg) : null,
    },
  ];

  const cadenceItems = cadenceInputs.flatMap(({ def, rule, lastDay }) => {
    const cadenceDays = cadenceDaysOf(rule?.value, def.defaultDays);
    if (!cadenceDays) return [];
    const item = cadenceReminder(def.type, def.label, lastDay, cadenceDays, today);
    return item ? [item] : [];
  });

  return [...cadenceItems, ...treatmentEndReminders(allRules, today)];
}
