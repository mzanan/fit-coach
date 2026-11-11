import { describe, expect, it } from "vitest";

import type { Profile } from "@/lib/db/schema";
import { hasTargets, targetsOf } from "@/lib/targets";

function profile(overrides: Partial<Profile>): Profile {
  return {
    protein_target: 155,
    fat_min: 45,
    fat_max: 55,
    fat_floor: 40,
    carbs_gym: 215,
    carbs_rest: 135,
    calories_target: 2150,
    calories_rest: 1975,
    ...overrides,
  } as Profile;
}

describe("targetsOf", () => {
  it("returns all 8 numbers when every target is set", () => {
    const p = profile({});
    expect(targetsOf(p)).toEqual({
      protein_target: 155,
      fat_min: 45,
      fat_max: 55,
      fat_floor: 40,
      carbs_gym: 215,
      carbs_rest: 135,
      calories_target: 2150,
      calories_rest: 1975,
    });
  });

  it("returns null when one target is null", () => {
    const p = profile({ fat_floor: null });
    expect(targetsOf(p)).toBeNull();
  });

  it("returns null when all targets are null", () => {
    const p = profile({
      protein_target: null,
      fat_min: null,
      fat_max: null,
      fat_floor: null,
      carbs_gym: null,
      carbs_rest: null,
      calories_target: null,
      calories_rest: null,
    });
    expect(targetsOf(p)).toBeNull();
  });
});

describe("hasTargets", () => {
  it("is true when all targets are set", () => {
    expect(hasTargets(profile({}))).toBe(true);
  });

  it("is false when targets are partial", () => {
    expect(hasTargets(profile({ carbs_rest: null }))).toBe(false);
  });
});
