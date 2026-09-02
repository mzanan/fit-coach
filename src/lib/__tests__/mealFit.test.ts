import { describe, expect, it } from "vitest";

import type { CatalogItem } from "@/lib/db/schema";
import {
  fits,
  filterRotation,
  parseClosedWeekdays,
  remainingOf,
  serializeClosedWeekdays,
  type MealFitBands,
  type MealFitTargets,
} from "@/lib/mealFit";

describe("remainingOf", () => {
  const targets: MealFitTargets = {
    protein_g: 150,
    fat_g: 55,
    carbs_g: 200,
    kcal: 2150,
  };

  it("returns target minus consumed for each macro", () => {
    const remaining = remainingOf({ protein_g: 100, fat_g: 30, carbs_g: 120 }, targets);
    expect(remaining.protein_g).toBe(50);
    expect(remaining.fat_g).toBe(25);
    expect(remaining.carbs_g).toBe(80);
  });

  it("computes remaining kcal via kcalOf", () => {
    const remaining = remainingOf({ protein_g: 100, fat_g: 30, carbs_g: 120 }, targets);
    const kcal = 100 * 4 + 120 * 4 + 30 * 9;
    expect(remaining.kcal).toBe(2150 - kcal);
  });
});

describe("fits", () => {
  const bands: MealFitBands = {
    fat_floor: 40,
    fat_max: 55,
    carbs_target: 200,
    kcal_target: 2150,
  };

  it("passes an item that fits within what's left, at any point in the day", () => {
    const remaining = { protein_g: 50, fat_g: 15, carbs_g: 20, kcal: 200 };
    const item = { protein_g: 30, fat_g: 5, carbs_g: 10 };
    expect(fits(item, remaining, bands)).toBe(true);
  });

  it("passes a breakfast item early in the day, when little budget has been spent yet", () => {
    const remaining = { protein_g: 150, fat_g: 55, carbs_g: 200, kcal: 2150 };
    const item = { protein_g: 20, fat_g: 15, carbs_g: 30 };
    expect(fits(item, remaining, bands)).toBe(true);
  });

  it("passes fat exactly at the tolerance over what remains", () => {
    const remaining = { protein_g: 50, fat_g: 0, carbs_g: 20, kcal: 200 };
    const item = { protein_g: 30, fat_g: 5.5, carbs_g: 10 };
    expect(fits(item, remaining, bands)).toBe(true);
  });

  it("fails fat more than the tolerance over what remains", () => {
    const remaining = { protein_g: 50, fat_g: 0, carbs_g: 20, kcal: 200 };
    const item = { protein_g: 30, fat_g: 6, carbs_g: 10 };
    expect(fits(item, remaining, bands)).toBe(false);
  });

  it("passes carbs exactly at the tolerance over what remains", () => {
    const remaining = { protein_g: 50, fat_g: 15, carbs_g: 0, kcal: 245 };
    const item = { protein_g: 30, fat_g: 5, carbs_g: 20 };
    expect(fits(item, remaining, bands)).toBe(true);
  });

  it("fails carbs more than the tolerance over what remains", () => {
    const remaining = { protein_g: 50, fat_g: 15, carbs_g: 0, kcal: 245 };
    const item = { protein_g: 30, fat_g: 5, carbs_g: 21 };
    expect(fits(item, remaining, bands)).toBe(false);
  });

  it("passes kcal exactly at the tolerance over what remains", () => {
    const remaining = { protein_g: 50, fat_g: 15, carbs_g: 20, kcal: 55 };
    const item = { protein_g: 30, fat_g: 5, carbs_g: 10 };
    expect(fits(item, remaining, bands)).toBe(true);
  });

  it("fails kcal more than the tolerance over what remains", () => {
    const remaining = { protein_g: 50, fat_g: 15, carbs_g: 20, kcal: 54 };
    const item = { protein_g: 30, fat_g: 5, carbs_g: 10 };
    expect(fits(item, remaining, bands)).toBe(false);
  });

  it("never fails on protein alone, however far over or under target", () => {
    const item = { protein_g: 0, fat_g: 5, carbs_g: 10 };
    const remainingOver = { protein_g: -1000, fat_g: 15, carbs_g: 20, kcal: 200 };
    expect(fits(item, remainingOver, bands)).toBe(true);
    const remainingUnder = { protein_g: 1000, fat_g: 15, carbs_g: 20, kcal: 200 };
    expect(fits(item, remainingUnder, bands)).toBe(true);
  });

  it("never fails for being under the fat floor: eating more can only help hit it", () => {
    const remaining = { protein_g: 50, fat_g: 55, carbs_g: 20, kcal: 200 };
    const item = { protein_g: 30, fat_g: 0, carbs_g: 10 };
    expect(fits(item, remaining, bands)).toBe(true);
  });

  it("fails once the day's remaining budget is already spent, however small the item", () => {
    const remaining = { protein_g: 50, fat_g: -5, carbs_g: 20, kcal: 200 };
    const item = { protein_g: 30, fat_g: 1, carbs_g: 10 };
    expect(fits(item, remaining, bands)).toBe(false);
  });
});

describe("filterRotation", () => {
  function item(overrides: Partial<CatalogItem>): CatalogItem {
    return {
      id: "id",
      user_id: "u1",
      name: "Item",
      place: null,
      protein_g: 20,
      fat_g: 5,
      carbs_g: 10,
      fat_quality: null,
      notes: null,
      is_composable: false,
      archived: false,
      delivery: false,
      dinner_only: false,
      company: null,
      closed_weekdays: null,
      auto_day_type: null,
      auto_category: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  it("drops items closed on the given weekday", () => {
    const items = [item({ closed_weekdays: "2,4" })];
    expect(filterRotation(items, { weekday: 2 })).toHaveLength(0);
    expect(filterRotation(items, { weekday: 3 })).toHaveLength(1);
  });

  it("drops dinner_only items outside the dinner category", () => {
    const items = [item({ dinner_only: true })];
    expect(filterRotation(items, { weekday: 1, category: "lunch" })).toHaveLength(0);
    expect(filterRotation(items, { weekday: 1, category: "dinner" })).toHaveLength(1);
  });

  it("drops items whose company is set and differs from the filter", () => {
    const items = [item({ company: "partner" })];
    expect(filterRotation(items, { weekday: 1, company: "solo" })).toHaveLength(0);
    expect(filterRotation(items, { weekday: 1, company: "partner" })).toHaveLength(1);
    expect(filterRotation(items, { weekday: 1 })).toHaveLength(1);
  });

  it("keeps items with no company set regardless of the filter", () => {
    const items = [item({ company: null })];
    expect(filterRotation(items, { weekday: 1, company: "solo" })).toHaveLength(1);
  });

  it("drops non-delivery items when deliveryOnly is set", () => {
    const items = [item({ delivery: false })];
    expect(filterRotation(items, { weekday: 1, deliveryOnly: true })).toHaveLength(0);
    expect(filterRotation(items, { weekday: 1, deliveryOnly: false })).toHaveLength(1);
  });
});

describe("closed weekdays parse/serialize", () => {
  it("parses a comma-separated string into numbers", () => {
    expect(parseClosedWeekdays("0,2,6")).toEqual([0, 2, 6]);
  });

  it("returns an empty array for null or empty input", () => {
    expect(parseClosedWeekdays(null)).toEqual([]);
    expect(parseClosedWeekdays("")).toEqual([]);
  });

  it("serializes a list of weekdays back to a comma-separated string", () => {
    expect(serializeClosedWeekdays([0, 2, 6])).toBe("0,2,6");
  });

  it("serializes an empty or missing list to null", () => {
    expect(serializeClosedWeekdays([])).toBeNull();
    expect(serializeClosedWeekdays(null)).toBeNull();
  });
});
