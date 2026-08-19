import { Pill } from "@/components/ui/Pill";
import { Surface } from "@/components/ui/Surface";
import type { ScanDelta } from "@/lib/data/bodyScans";
import type { BodyScan } from "@/lib/db/schema";
import { scanVerdict, signed } from "@/lib/scanVerdict";

export function RecompHero({
  latest,
  delta,
}: {
  latest: BodyScan;
  delta: ScanDelta | null;
}) {
  if (!delta) {
    return (
      <Surface level="raised" className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Body fat</p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="num text-hero font-semibold tracking-(--tracking-hero)">
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
          Skeletal muscle{" "}
          <span className="num">{latest.skeletal_muscle_kg ?? "--"}</span> kg
          <span className="mx-1.5 text-faint">·</span>
          Weight <span className="num">{latest.weight_kg ?? "--"}</span> kg
        </p>
        <p className="mt-4 text-meta text-faint">
          First scan. Import another in 4 weeks to see the trend.
        </p>
      </Surface>
    );
  }

  const lead =
    delta.skeletal_muscle_kg != null
      ? {
          label: "Skeletal muscle",
          value: delta.skeletal_muscle_kg,
          unit: "kg",
        }
      : delta.body_fat_pct != null
        ? { label: "Body fat", value: delta.body_fat_pct, unit: "%" }
        : delta.weight_kg != null
          ? { label: "Weight", value: delta.weight_kg, unit: "kg" }
          : null;

  if (!lead) {
    return (
      <Surface level="raised" className="p-5">
        <p className="eyebrow">Last scan</p>
        <p className="mt-3 text-body text-muted-foreground">
          This scan and the previous one share no comparable values.
        </p>
      </Surface>
    );
  }

  const note = scanVerdict(delta);

  return (
    <Surface level="raised" className="p-5">
      <p className="eyebrow">
        {lead.label}, {delta.days} days
      </p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="num text-hero font-semibold tracking-(--tracking-hero)">
          {signed(lead.value)}
        </span>
        <span className="text-meta text-faint">{lead.unit}</span>
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
      {note ? <p className="mt-4 text-body">{note}</p> : null}
    </Surface>
  );
}
