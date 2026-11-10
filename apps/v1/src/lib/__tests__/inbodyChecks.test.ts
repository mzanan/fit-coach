import { describe, expect, it } from "vitest";

import { verifyScan } from "@/lib/inbodyChecks";

describe("verifyScan", () => {
  it("passes when values are consistent", () => {
    const values = {
      height_cm: 175,
      weight_kg: 70,
      body_fat_pct: 20,
      body_fat_kg: 14,
      fat_free_mass_kg: 56,
      bmi: 70 / (1.75 * 1.75),
    };
    const result = verifyScan(values, null);
    expect(result.ok).toBe(true);
    expect(result.failed).toEqual([]);
  });

  it("flags an inconsistent field with suspectFields", () => {
    const values = {
      height_cm: 175,
      weight_kg: 70,
      body_fat_pct: 40,
      body_fat_kg: 14,
      fat_free_mass_kg: 56,
      bmi: 70 / (1.75 * 1.75),
    };
    const result = verifyScan(values, null);
    expect(result.failed.length).toBeGreaterThan(0);
    expect(result.suspectFields).toContain("body_fat_pct");
  });

  it("skips checks whose inputs are null", () => {
    const values = {
      height_cm: null,
      weight_kg: null,
      body_fat_pct: null,
      body_fat_kg: null,
      fat_free_mass_kg: null,
      bmi: null,
    };
    const result = verifyScan(values, null);
    expect(result.passed).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(result.ok).toBe(false);
  });
});
