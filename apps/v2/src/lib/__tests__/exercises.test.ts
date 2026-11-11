import { describe, expect, it } from "vitest";

import { EXERCISE_DATASET_REF, exerciseGifUrl, formatExerciseMeta } from "@/lib/exercises";

describe("exerciseGifUrl", () => {
  it("builds the url with the pinned dataset ref", () => {
    expect(exerciseGifUrl("gifs/bench-press.gif")).toBe(
      `https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@${EXERCISE_DATASET_REF}/gifs/bench-press.gif`,
    );
  });
});

describe("formatExerciseMeta", () => {
  it("joins equipment and target with a middle dot", () => {
    expect(formatExerciseMeta("barbell", "chest")).toBe("barbell · chest");
  });

  it("returns just the field when only one is present", () => {
    expect(formatExerciseMeta("barbell", null)).toBe("barbell");
    expect(formatExerciseMeta(null, "chest")).toBe("chest");
  });

  it("returns undefined when neither is present", () => {
    expect(formatExerciseMeta(null, null)).toBeUndefined();
  });
});
