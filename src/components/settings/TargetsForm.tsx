"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { NumberField } from "@/components/ui/NumberField";
import { Surface } from "@/components/ui/Surface";
import { updateTargets } from "@/lib/actions/profile";
import type { Profile } from "@/lib/db/schema";
import { useAction } from "@/hooks/useAction";

export function TargetsForm({ profile }: { profile: Profile }) {
  const { pending, run } = useAction();
  const [v, setV] = useState({
    protein_target: String(profile.protein_target),
    fat_min: String(profile.fat_min),
    fat_max: String(profile.fat_max),
    fat_floor: String(profile.fat_floor),
    carbs_gym: String(profile.carbs_gym),
    carbs_rest: String(profile.carbs_rest),
    calories_target: String(profile.calories_target),
  });
  const set = (k: keyof typeof v) => (val: string) =>
    setV((prev) => ({ ...prev, [k]: val }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(
      () =>
        updateTargets({
          protein_target: Number(v.protein_target),
          fat_min: Number(v.fat_min),
          fat_max: Number(v.fat_max),
          fat_floor: Number(v.fat_floor),
          carbs_gym: Number(v.carbs_gym),
          carbs_rest: Number(v.carbs_rest),
          calories_target: Number(v.calories_target),
        }),
      { success: "Targets saved" },
    );
  }

  return (
    <Surface className="p-card">
      <form onSubmit={submit} className="space-y-card">
        <NumberField
          id="calories_target"
          label="Calories"
          value={v.calories_target}
          onChange={set("calories_target")}
        />
        <NumberField
          id="protein_target"
          label="Protein (g)"
          value={v.protein_target}
          onChange={set("protein_target")}
        />
        <div>
          <p className="eyebrow mb-1.5">Carbs (g)</p>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              id="carbs_gym"
              label="Gym day"
              value={v.carbs_gym}
              onChange={set("carbs_gym")}
            />
            <NumberField
              id="carbs_rest"
              label="Rest day"
              value={v.carbs_rest}
              onChange={set("carbs_rest")}
            />
          </div>
        </div>
        <div>
          <p className="eyebrow mb-1.5">Fat (g)</p>
          <div className="grid grid-cols-3 gap-2">
            <NumberField
              id="fat_floor"
              label="Floor"
              value={v.fat_floor}
              onChange={set("fat_floor")}
            />
            <NumberField
              id="fat_min"
              label="Min"
              value={v.fat_min}
              onChange={set("fat_min")}
            />
            <NumberField
              id="fat_max"
              label="Max"
              value={v.fat_max}
              onChange={set("fat_max")}
            />
          </div>
          <p className="mt-2 text-meta text-muted-foreground">
            Min and max are the target band. Floor is the hard minimum.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving..." : "Save targets"}
        </Button>
      </form>
    </Surface>
  );
}
