import { describe, expect, it } from "vitest";

import { carbTarget, kcalOf, macroSummary, sumMacros } from "@/lib/macros";
import type { Profile } from "@/lib/db/schema";

describe("kcalOf", () => {
  it("computes protein and carbs at 4 kcal/g and fat at 9 kcal/g", () => {
    expect(kcalOf({ protein_g: 10, carbs_g: 20, fat_g: 5 })).toBe(10 * 4 + 20 * 4 + 5 * 9);
  });
});

describe("sumMacros", () => {
  it("returns zeros for an empty list", () => {
    expect(sumMacros([])).toEqual({ protein_g: 0, fat_g: 0, carbs_g: 0 });
  });

  it("sums two items", () => {
    expect(
      sumMacros([
        { protein_g: 10, fat_g: 5, carbs_g: 20 },
        { protein_g: 15, fat_g: 3, carbs_g: 10 },
      ]),
    ).toEqual({ protein_g: 25, fat_g: 8, carbs_g: 30 });
  });
});

describe("carbTarget", () => {
  const profile = { carbs_gym: 200, carbs_rest: 120 } as Profile;

  it("returns carbs_gym on a gym day", () => {
    expect(carbTarget(profile, true)).toBe(200);
  });

  it("returns carbs_rest on a rest day", () => {
    expect(carbTarget(profile, false)).toBe(120);
  });
});

describe("macroSummary", () => {
  const profile = {
    protein_target: 150,
    fat_min: 50,
    fat_max: 80,
    fat_floor: 40,
    carbs_gym: 200,
    carbs_rest: 120,
    calories_target: 2000,
  } as Profile;

  it("flags low protein with warn", () => {
    const { lines } = macroSummary({ protein_g: 100, fat_g: 65, carbs_g: 150 }, profile, true);
    const protein = lines.find((l) => l.key === "protein")!;
    expect(protein.state).toBe("low");
    expect(protein.warn).toBe(true);
  });

  it("flags fat below the floor with warn", () => {
    const { lines } = macroSummary({ protein_g: 150, fat_g: 30, carbs_g: 150 }, profile, true);
    const fat = lines.find((l) => l.key === "fat")!;
    expect(fat.state).toBe("low");
    expect(fat.warn).toBe(true);
  });

  it("reports ok when everything is in range", () => {
    const { lines } = macroSummary({ protein_g: 150, fat_g: 65, carbs_g: 150 }, profile, true);
    const protein = lines.find((l) => l.key === "protein")!;
    const fat = lines.find((l) => l.key === "fat")!;
    const calories = lines.find((l) => l.key === "calories")!;
    expect(protein.state).toBe("ok");
    expect(protein.warn).toBe(false);
    expect(fat.state).toBe("ok");
    expect(fat.warn).toBe(false);
    expect(calories.state).toBe("ok");
    expect(calories.warn).toBe(false);
  });

  it("flags calories over target with warn", () => {
    const { lines, kcal } = macroSummary({ protein_g: 150, fat_g: 65, carbs_g: 300 }, profile, true);
    const calories = lines.find((l) => l.key === "calories")!;
    expect(kcal).toBeGreaterThan(profile.calories_target * 1.1);
    expect(calories.state).toBe("over");
    expect(calories.warn).toBe(true);
  });
});
