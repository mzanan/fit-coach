import { describe, expect, it } from "vitest";

import { nextWeight, todaysLabel } from "@/lib/routine";
import type { HistorySet } from "@/lib/workoutHistory";

function uniformSets(reps: number, weight: number, count = 3): HistorySet[] {
  return Array.from({ length: count }, () => ({ reps, weight, per_side: false }));
}

describe("nextWeight", () => {
  it("raises the weight by increment_kg when the last two sessions were clean", () => {
    const result = nextWeight(
      { current_weight: 60, increment_kg: 2.5 },
      [
        { day: "2026-08-29", sets: uniformSets(8, 60) },
        { day: "2026-08-25", sets: uniformSets(8, 60) },
      ],
    );
    expect(result).toEqual({
      weight: 62.5,
      raise: true,
      reason: expect.any(String),
    });
  });

  it("keeps the current weight and does not raise when fewer than two sessions exist", () => {
    const result = nextWeight(
      { current_weight: 60, increment_kg: 2.5 },
      [{ day: "2026-08-29", sets: uniformSets(8, 60) }],
    );
    expect(result.raise).toBe(false);
    expect(result.weight).toBe(60);
    expect(result.reason).toContain("Only 1 logged session");
  });

  it("keeps the current weight and does not raise when a session was not clean", () => {
    const droppedReps: HistorySet[] = [
      { reps: 8, weight: 60, per_side: false },
      { reps: 5, weight: 60, per_side: false },
    ];
    const result = nextWeight(
      { current_weight: 60, increment_kg: 2.5 },
      [
        { day: "2026-08-29", sets: droppedReps },
        { day: "2026-08-25", sets: uniformSets(8, 60) },
      ],
    );
    expect(result.raise).toBe(false);
    expect(result.weight).toBe(60);
  });

  it("returns a null weight and does not raise when eligible but no current weight is recorded", () => {
    const result = nextWeight(
      { current_weight: null, increment_kg: 2.5 },
      [
        { day: "2026-08-29", sets: uniformSets(8, 60) },
        { day: "2026-08-25", sets: uniformSets(8, 60) },
      ],
    );
    expect(result.raise).toBe(false);
    expect(result.weight).toBeNull();
  });
});

describe("todaysLabel", () => {
  const slots = [
    { weekday: 1, label: "Upper A" },
    { weekday: 2, label: "Lower A" },
  ];

  it("returns the label for today's weekday", () => {
    expect(todaysLabel(slots, "2026-09-01")).toBe("Lower A");
  });

  it("returns null when no slot exists for today's weekday", () => {
    expect(todaysLabel(slots, "2026-09-02")).toBeNull();
  });

  it("returns null when there are no slots at all", () => {
    expect(todaysLabel([], "2026-09-01")).toBeNull();
  });
});
