import { describe, expect, it } from "vitest";

import {
  dayConfig,
  daysSinceMonday,
  formatDayLabel,
  isGymWeekday,
  logicalDayOf,
  shiftDay,
  shortDay,
} from "@/lib/dates";

describe("dayConfig", () => {
  it("returns defaults when profile is undefined", () => {
    expect(dayConfig(undefined)).toEqual({
      timezone: "Asia/Ho_Chi_Minh",
      cutoffHour: 4,
    });
  });

  it("returns defaults when profile fields are null", () => {
    expect(dayConfig({ timezone: null, day_cutoff_hour: null })).toEqual({
      timezone: "Asia/Ho_Chi_Minh",
      cutoffHour: 4,
    });
  });

  it("overrides defaults with real values", () => {
    expect(dayConfig({ timezone: "America/New_York", day_cutoff_hour: 2 })).toEqual({
      timezone: "America/New_York",
      cutoffHour: 2,
    });
  });
});

describe("logicalDayOf", () => {
  const cfg = { timezone: "Asia/Ho_Chi_Minh", cutoffHour: 4 };

  it("falls into the previous day when ICT time is before cutoff", () => {
    const date = new Date("2026-08-19T20:00:00.000Z");
    expect(logicalDayOf(date, cfg)).toBe("2026-08-19");
  });

  it("falls into the same day when ICT time is after cutoff", () => {
    const date = new Date("2026-08-19T22:00:00.000Z");
    expect(logicalDayOf(date, cfg)).toBe("2026-08-20");
  });
});

describe("shiftDay", () => {
  it("adds a day across a month boundary", () => {
    expect(shiftDay("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("subtracts a day across a year boundary", () => {
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("isGymWeekday", () => {
  it("is true for Monday, Tuesday, Thursday, Friday", () => {
    expect(isGymWeekday("2026-08-17")).toBe(true);
    expect(isGymWeekday("2026-08-18")).toBe(true);
    expect(isGymWeekday("2026-08-20")).toBe(true);
    expect(isGymWeekday("2026-08-21")).toBe(true);
  });

  it("is false for Wednesday, Saturday, Sunday", () => {
    expect(isGymWeekday("2026-08-19")).toBe(false);
    expect(isGymWeekday("2026-08-22")).toBe(false);
    expect(isGymWeekday("2026-08-23")).toBe(false);
  });
});

describe("daysSinceMonday", () => {
  it("returns 0 for Monday and 6 for Sunday", () => {
    expect(daysSinceMonday("2026-08-17")).toBe(0);
    expect(daysSinceMonday("2026-08-23")).toBe(6);
  });
});

describe("shortDay", () => {
  it("returns the correct abbreviation for a fixed date", () => {
    expect(shortDay("2026-08-19")).toBe("Wed");
  });
});

describe("formatDayLabel", () => {
  const today = "2026-08-19";

  it("labels today, yesterday and tomorrow", () => {
    expect(formatDayLabel("2026-08-19", today)).toBe("Today");
    expect(formatDayLabel("2026-08-18", today)).toBe("Yesterday");
    expect(formatDayLabel("2026-08-20", today)).toBe("Tomorrow");
  });

  it("formats other days as EEE, MMM d", () => {
    expect(formatDayLabel("2026-08-10", today)).toBe("Mon, Aug 10");
  });
});
