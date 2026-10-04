import { MacroSummaryCard } from "@/components/ui/MacroSummaryCard";
import { topNote } from "@/lib/macroNotes";
import type { MacroLine } from "@/lib/macros";
import type { Targets } from "@/lib/targets";

const LABEL = { protein: "Protein", carbs: "Carbs", fat: "Fat" } as const;

export function MacroOverview({
  summary,
  targets,
}: {
  summary: { lines: MacroLine[]; kcal: number; kcalTarget: number };
  targets: Targets;
}) {
  const calories = summary.lines.find((l) => l.key === "calories")!;
  const remaining = Math.round(summary.kcalTarget - summary.kcal);
  const note =
    topNote(summary.lines) ??
    (calories.state === "under" ? "Low intake so far today." : null);

  return (
    <MacroSummaryCard
      remaining={remaining}
      over={remaining < 0}
      kcalTarget={Math.round(summary.kcalTarget)}
      kcalPct={calories.pct}
      note={note}
      lines={(["protein", "carbs", "fat"] as const).map((key) => {
        const line = summary.lines.find((l) => l.key === key)!;
        return {
          key,
          label: LABEL[key],
          current: line.current,
          target:
            key === "fat" ? `${targets.fat_min}-${targets.fat_max}` : `${line.target}`,
          pct: line.pct,
        };
      })}
    />
  );
}
