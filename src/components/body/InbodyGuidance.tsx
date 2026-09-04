import { Stat } from "@/components/ui/Stat";
import { Surface } from "@/components/ui/Surface";
import type { BodyScan } from "@/lib/db/schema";
import type { Targets } from "@/lib/targets";

export function InbodyGuidance({
  scan,
  targets,
}: {
  scan: BodyScan;
  targets: Targets | null;
}) {
  const recommended = scan.recommended_kcal;
  const gap =
    targets && recommended != null
      ? Math.round(targets.calories_target - recommended)
      : null;

  const perKg =
    targets && scan.weight_kg && scan.weight_kg > 0
      ? Math.round((targets.protein_target / scan.weight_kg) * 100) / 100
      : null;

  return (
    <Surface className="p-5">
      <h2 className="text-title font-medium tracking-(--tracking-snug)">
        What InBody suggests
      </h2>

      {recommended != null ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Stat label="Recommended intake" value={recommended} unit="kcal" />
            {targets ? (
              <Stat
                label="Your target"
                value={Math.round(targets.calories_target)}
                unit="kcal"
              />
            ) : null}
          </div>
          {gap !== null ? (
            <p className="mt-3 text-meta text-muted-foreground">
              {gap < 0
                ? `Your target is ${Math.abs(gap)} kcal under InBody's estimate. That is the deficit.`
                : gap > 0
                  ? `Your target is ${gap} kcal above InBody's estimate. That is a surplus, not a cut.`
                  : "Your target matches InBody's estimate."}
            </p>
          ) : null}
        </>
      ) : null}

      <div className="mt-5 grid grid-cols-3 gap-4">
        <Stat label="Fat control" value={scan.fat_control_kg} unit="kg" />
        <Stat label="Muscle control" value={scan.muscle_control_kg} unit="kg" />
        <Stat label="Target weight" value={scan.target_weight_kg} unit="kg" />
      </div>

      {perKg != null && targets != null ? (
        <p className="mt-5 text-meta text-muted-foreground">
          Protein target <span className="num">{targets.protein_target}</span> g ={" "}
          <span className="num">{perKg}</span> g per kg of body weight.
        </p>
      ) : null}
    </Surface>
  );
}
