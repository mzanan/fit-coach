import { ColumnChart } from "@/components/ui/ColumnChart";
import { Stat } from "@/components/ui/Stat";
import { Surface } from "@/components/ui/Surface";
import type { DailyIntake, PeriodAdherence } from "@/lib/data/bodyScans";
import { shortDay } from "@/lib/dates";

export function IntakeSinceScan({
  adherence,
  daily,
  title,
}: {
  adherence: PeriodAdherence;
  daily: DailyIntake[];
  title: string;
}) {
  const logged = daily.filter((d) => d.kcal != null);
  const hasKcalTarget = adherence.kcalTarget != null;

  return (
    <Surface className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-title font-medium tracking-(--tracking-snug)">
          {title}
        </h2>
        <span className="text-meta text-faint">
          <span className="num">{adherence.days}</span> days
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Stat
          label="Avg calories"
          value={adherence.avgKcal}
          hint={hasKcalTarget ? `Target ${Math.round(adherence.kcalTarget!)}` : undefined}
        />
        <Stat
          label="Protein hit"
          value={
            adherence.proteinHitDays != null
              ? `${adherence.proteinHitDays}/${adherence.daysLogged}`
              : "No targets"
          }
          hint={adherence.proteinHitDays != null ? "days at 90%+" : undefined}
        />
        <Stat label="Gym sessions" value={adherence.workouts} />
      </div>

      <div className="mt-6">
        {logged.length === 0 ? (
          <p className="text-meta text-muted-foreground">
            No meals logged in this window.
          </p>
        ) : (
          <ColumnChart
            points={daily.map((d) => ({
              label: shortDay(d.day),
              value: d.kcal,
            }))}
            refValue={adherence.kcalTarget ?? undefined}
            refLabel="Target"
            unit="kcal"
            ariaLabel={
              hasKcalTarget
                ? `Daily calories for the last ${daily.length} days against a target of ${Math.round(adherence.kcalTarget!)} kcal`
                : `Daily calories for the last ${daily.length} days`
            }
          />
        )}
      </div>
    </Surface>
  );
}
