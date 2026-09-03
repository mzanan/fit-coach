import { describe, expect, it } from "vitest";

import { resolveDayType } from "@/lib/dayType";

describe("resolveDayType", () => {
  it("uses the explicit day_type when the days row has one", () => {
    expect(
      resolveDayType({
        dayRow: { day_type: "rest" },
        slots: [{ weekday: 1 }],
        day: "2026-08-17",
      }),
    ).toBe("rest");
  });

  it("falls back to isGymWeekday when the user has zero slots", () => {
    expect(
      resolveDayType({ dayRow: null, slots: [], day: "2026-08-17" }),
    ).toBe("gym");
    expect(
      resolveDayType({ dayRow: null, slots: [], day: "2026-08-19" }),
    ).toBe("rest");
  });

  it("is gym when a slot exists for that weekday", () => {
    expect(
      resolveDayType({
        dayRow: null,
        slots: [{ weekday: 3 }],
        day: "2026-08-19",
      }),
    ).toBe("gym");
  });

  it("is rest when the user has slots but none for that weekday", () => {
    expect(
      resolveDayType({
        dayRow: null,
        slots: [{ weekday: 1 }, { weekday: 2 }],
        day: "2026-08-19",
      }),
    ).toBe("rest");
  });
});
