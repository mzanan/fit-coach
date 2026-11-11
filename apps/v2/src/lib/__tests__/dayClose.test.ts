import { describe, expect, it } from "vitest";

import { dayDeviations, weeklyStepsAverage } from "@/lib/dayClose";
import type { Day } from "@/lib/db/schema";
import type { MacroLine } from "@/lib/macros";

function day(steps: number | null): Day {
  return {
    id: "d1",
    user_id: "u1",
    logical_day: "2026-09-01",
    day_type: "gym",
    steps,
    notes: null,
    closed_at: null,
    created_at: new Date(),
  } as Day;
}

function line(key: MacroLine["key"], state: MacroLine["state"]): MacroLine {
  return { key, current: 0, target: 0, remaining: 0, pct: 0, state, warn: false };
}

describe("weeklyStepsAverage", () => {
  it("returns null when there are no days", () => {
    expect(weeklyStepsAverage([])).toBeNull();
  });

  it("returns null when no day has logged steps", () => {
    expect(weeklyStepsAverage([day(null), day(null)])).toBeNull();
  });

  it("averages only the days with logged steps", () => {
    expect(weeklyStepsAverage([day(10000), day(null), day(8000)])).toBe(9000);
  });

  it("rounds the average", () => {
    expect(weeklyStepsAverage([day(10000), day(9001)])).toBe(9501);
  });
});

describe("dayDeviations", () => {
  it("returns an empty array when every line is ok", () => {
    const summary = {
      lines: [line("protein", "ok"), line("fat", "ok"), line("carbs", "ok"), line("calories", "ok")],
    };
    expect(dayDeviations(summary, 3)).toEqual([]);
  });

  it("returns only the lines outside their band", () => {
    const low = line("protein", "low");
    const ok = line("fat", "ok");
    const over = line("calories", "over");
    const summary = { lines: [low, ok, over] };
    expect(dayDeviations(summary, 3)).toEqual([low, over]);
  });

  it("includes under and high states as deviations", () => {
    const under = line("carbs", "under");
    const high = line("fat", "high");
    const summary = { lines: [under, high] };
    expect(dayDeviations(summary, 3)).toEqual([under, high]);
  });

  it("returns an empty array when no meals are logged yet, even if lines look off-band", () => {
    const low = line("protein", "low");
    const over = line("calories", "over");
    const summary = { lines: [low, over] };
    expect(dayDeviations(summary, 0)).toEqual([]);
  });
});
