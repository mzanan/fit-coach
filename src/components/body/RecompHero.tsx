import { Pill } from "@/components/ui/Pill";
import { Surface } from "@/components/ui/Surface";
import type { ScanDelta } from "@/lib/data/bodyScans";
import type { BodyScan } from "@/lib/db/schema";

function verdict(delta: ScanDelta): string {
  const muscle = delta.skeletal_muscle_kg;
  const fat = delta.body_fat_kg;
  if (muscle == null || fat == null) return "Not enough values to compare.";
  const flat = (n: number) => Math.abs(n) <= 0.3;
  if (flat(muscle) && flat(fat)) return `Little movement in ${delta.days} days.`;
  if (muscle > 0 && fat < 0) return "Recomposition. Muscle up, fat down.";
  if (muscle > 0 && fat > 0) return "Gaining both. Consider trimming calories.";
  if (muscle < 0 && fat < 0)
    return "Losing both. Protein or the deficit is too aggressive.";
  if (flat(muscle) && fat < 0) return "Fat down, muscle held. That is the goal.";
  return "Muscle down while fat holds. Check protein and training.";
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export function RecompHero({
  latest,
  delta,
}: {
  latest: BodyScan;
  delta: ScanDelta | null;
}) {
  if (!delta || delta.skeletal_muscle_kg == null) {
    return (
      <Surface level="raised" className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Body fat</p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="num text-hero font-semibold tracking-[--tracking-hero]">
                {latest.body_fat_pct ?? "--"}
              </span>
              <span className="text-meta text-faint">%</span>
            </p>
          </div>
          {latest.inbody_score != null ? (
            <Pill tone="brand">
              <span className="num">{latest.inbody_score}</span> score
            </Pill>
          ) : null}
        </div>
        <p className="mt-3 text-meta text-muted-foreground">
          Skeletal muscle <span className="num">{latest.skeletal_muscle_kg ?? "--"}</span> kg
          <span className="mx-1.5 text-faint">·</span>
          Weight <span className="num">{latest.weight_kg ?? "--"}</span> kg
        </p>
        <p className="mt-4 text-meta text-faint">
          First scan. Import another in 4 weeks to see the trend.
        </p>
      </Surface>
    );
  }

  return (
    <Surface level="raised" className="p-5">
      <p className="eyebrow">Skeletal muscle, {delta.days} days</p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="num text-hero font-semibold tracking-[--tracking-hero]">
          {signed(delta.skeletal_muscle_kg)}
        </span>
        <span className="text-meta text-faint">kg</span>
      </p>
      <p className="mt-3 text-meta text-muted-foreground">
        Body fat{" "}
        <span className="num">
          {delta.body_fat_kg != null ? signed(delta.body_fat_kg) : "--"}
        </span>{" "}
        kg
        <span className="mx-1.5 text-faint">·</span>
        Weight{" "}
        <span className="num">
          {delta.weight_kg != null ? signed(delta.weight_kg) : "--"}
        </span>{" "}
        kg
      </p>
      <p className="mt-4 text-body">{verdict(delta)}</p>
    </Surface>
  );
}
