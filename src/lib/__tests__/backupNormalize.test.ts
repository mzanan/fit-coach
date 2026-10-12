import { describe, expect, it } from "vitest";

import {
  normalizeBackupWorkouts,
  referencedExerciseCatalogIds,
} from "@/lib/backupNormalize";

describe("normalizeBackupWorkouts", () => {
  it("keeps the earliest workout per day and moves exercises of duplicates onto it", () => {
    const result = normalizeBackupWorkouts(
      [
        { id: "w2", logical_day: "2026-09-01", created_at: "2026-09-01T12:00:00.000Z" },
        { id: "w1", logical_day: "2026-09-01", created_at: "2026-09-01T10:00:00.000Z" },
        { id: "w3", logical_day: "2026-09-02", created_at: "2026-09-02T10:00:00.000Z" },
      ],
      [
        { id: "e1", workout_id: "w1", exercise_catalog_id: null },
        { id: "e2", workout_id: "w2", exercise_catalog_id: null },
        { id: "e3", workout_id: "w3", exercise_catalog_id: null },
      ],
      new Set(),
    );

    expect(result.workouts.map((w) => w.id)).toEqual(["w1", "w3"]);
    expect(result.workout_exercises.map((e) => e.workout_id)).toEqual(["w1", "w1", "w3"]);
  });

  it("drops exercise catalog references that do not exist", () => {
    const result = normalizeBackupWorkouts(
      [{ id: "w1", logical_day: "2026-09-01", created_at: "2026-09-01T10:00:00.000Z" }],
      [
        { id: "e1", workout_id: "w1", exercise_catalog_id: "known" },
        { id: "e2", workout_id: "w1", exercise_catalog_id: "missing" },
      ],
      new Set(["known"]),
    );

    expect(result.workout_exercises.map((e) => e.exercise_catalog_id)).toEqual(["known", null]);
  });
});

describe("referencedExerciseCatalogIds", () => {
  it("returns each non-empty id once", () => {
    expect(
      referencedExerciseCatalogIds([
        { exercise_catalog_id: "a" },
        { exercise_catalog_id: "a" },
        { exercise_catalog_id: null },
        { exercise_catalog_id: "" },
        { exercise_catalog_id: "b" },
      ]),
    ).toEqual(["a", "b"]);
  });
});
