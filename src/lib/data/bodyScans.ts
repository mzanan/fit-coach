import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { BodyScan, Profile } from "@/lib/db/schema";
import { dayConfig, shiftDay, todayLogicalDay } from "@/lib/dates";

import { kcalOf } from "@/lib/macros";

const { body_scans, meals, workouts } = schema;

export interface ScanDelta {
  days: number;
  weight_kg: number | null;
  skeletal_muscle_kg: number | null;
  body_fat_kg: number | null;
  body_fat_pct: number | null;
}

export interface PeriodAdherence {
  days: number;
  daysLogged: number;
  proteinHitDays: number;
  avgProtein: number | null;
  avgKcal: number | null;
  kcalTarget: number;
  proteinTarget: number;
  workouts: number;
}

export interface BodyScanOverview {
  latest: BodyScan | null;
  previous: BodyScan | null;
  delta: ScanDelta | null;
  history: BodyScan[];
  adherence: PeriodAdherence | null;
}

function diff(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return Math.round((a - b) * 100) / 100;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function periodAdherence(
  userId: string,
  profile: Profile,
  fromDay: string,
  toDay: string,
): Promise<PeriodAdherence> {
  const days: string[] = [];
  let cursor = toDay;
  while (cursor >= fromDay && days.length < 120) {
    days.push(cursor);
    cursor = shiftDay(cursor, -1);
  }

  const [mealRows, workoutRows] = await Promise.all([
    db
      .select()
      .from(meals)
      .where(and(eq(meals.user_id, userId), inArray(meals.logical_day, days))),
    db
      .select({ logical_day: workouts.logical_day })
      .from(workouts)
      .where(and(eq(workouts.user_id, userId), inArray(workouts.logical_day, days))),
  ]);

  const byDay = new Map<string, { protein: number; kcal: number }>();
  for (const row of mealRows) {
    const current = byDay.get(row.logical_day) ?? { protein: 0, kcal: 0 };
    current.protein += row.protein_g;
    current.kcal += kcalOf(row);
    byDay.set(row.logical_day, current);
  }

  const logged = [...byDay.values()];
  const proteinHitDays = logged.filter(
    (d) => d.protein >= profile.protein_target * 0.9,
  ).length;
  const avg = (pick: (d: { protein: number; kcal: number }) => number) =>
    logged.length
      ? Math.round(logged.reduce((total, d) => total + pick(d), 0) / logged.length)
      : null;

  return {
    days: days.length,
    daysLogged: byDay.size,
    proteinHitDays,
    avgProtein: avg((d) => d.protein),
    avgKcal: avg((d) => d.kcal),
    kcalTarget: profile.calories_target,
    proteinTarget: profile.protein_target,
    workouts: new Set(workoutRows.map((w) => w.logical_day)).size,
  };
}

export async function getBodyScanOverview(
  userId: string,
  profile: Profile,
): Promise<BodyScanOverview> {
  const history = await db
    .select()
    .from(body_scans)
    .where(eq(body_scans.user_id, userId))
    .orderBy(desc(body_scans.taken_at))
    .limit(24);

  const latest = history[0] ?? null;
  const previous = history[1] ?? null;
  if (!latest) {
    return { latest: null, previous: null, delta: null, history: [], adherence: null };
  }

  const delta = previous
    ? {
        days: Math.max(
          1,
          Math.round(
            (latest.taken_at.getTime() - previous.taken_at.getTime()) / 86_400_000,
          ),
        ),
        weight_kg: diff(latest.weight_kg, previous.weight_kg),
        skeletal_muscle_kg: diff(
          latest.skeletal_muscle_kg,
          previous.skeletal_muscle_kg,
        ),
        body_fat_kg: diff(latest.body_fat_kg, previous.body_fat_kg),
        body_fat_pct: diff(latest.body_fat_pct, previous.body_fat_pct),
      }
    : null;

  const cfg = dayConfig(profile);
  const toDay = todayLogicalDay(cfg);
  const fromDay = previous
    ? dayKey(previous.taken_at)
    : shiftDay(toDay, -Math.min(28, 28));

  const adherence = await periodAdherence(userId, profile, fromDay, toDay);

  return {
    latest,
    previous,
    delta,
    history: [...history].reverse(),
    adherence,
  };
}

export async function getScanCount(userId: string): Promise<number> {
  const rows = await db
    .select({ id: body_scans.id })
    .from(body_scans)
    .where(eq(body_scans.user_id, userId));
  return rows.length;
}
