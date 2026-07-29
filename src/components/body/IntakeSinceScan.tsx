import { ColumnChart } from "@/components/ui/ColumnChart";
import { Stat } from "@/components/ui/Stat";
import { Surface } from "@/components/ui/Surface";
import type { DailyIntake, PeriodAdherence } from "@/lib/data/bodyScans";
import { cn } from "@/lib/utils";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shortDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return WEEKDAY[d.getUTCDay()] ?? "";
}

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
          hint={`Target ${Math.round(adherence.kcalTarget)}`}
        />
        <Stat
          label="Protein hit"
          value={`${adherence.proteinHitDays}/${adherence.daysLogged}`}
          hint="days at 90%+"
        />
        <Stat label="Gym sessions" value={adherence.workouts} />
      </div>

      <div
        className={cn("mt-6", daily.length <= 5 && "max-w-(--container-focus)")}
      >
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
            refValue={adherence.kcalTarget}
            refLabel="Target"
            unit="kcal"
            ariaLabel={`Daily calories for the last ${daily.length} days against a target of ${Math.round(adherence.kcalTarget)} kcal`}
          />
        )}
      </div>
    </Surface>
  );
}
