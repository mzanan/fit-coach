import { describe, expect, it } from "vitest";

import { matchesTerm, normalizeSearch } from "@/lib/search";

describe("normalizeSearch", () => {
  it("lowercases and trims", () => {
    expect(normalizeSearch("  Hello World  ")).toBe("hello world");
  });

  it("maps đ/Đ to d and removes diacritics", () => {
    expect(normalizeSearch("Đà Nẵng")).toBe("da nang");
  });
});

describe("matchesTerm", () => {
  it("matches a direct substring", () => {
    expect(matchesTerm("Đà Nẵng", "nang")).toBe(true);
  });

  it("returns false for an empty needle", () => {
    expect(matchesTerm("Đà Nẵng", "")).toBe(false);
  });

  it("matches multi-token terms in any order", () => {
    expect(matchesTerm("Đà Nẵng", "nang da")).toBe(true);
  });

  it("returns false when a token is missing", () => {
    expect(matchesTerm("Đà Nẵng", "nang hanoi")).toBe(false);
  });
});
