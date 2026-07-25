import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Surface } from "@/components/ui/Surface";
import type { Profile } from "@/lib/db/schema";
import type { MacroLine } from "@/lib/macros";

const META: Record<string, { label: string; bar: string }> = {
  protein: { label: "Protein", bar: "bg-macro-protein" },
  carbs: { label: "Carbs", bar: "bg-macro-carbs" },
  fat: { label: "Fat", bar: "bg-macro-fat" },
};

function noteFor(line: MacroLine): string | null {
  if (line.key === "protein" && line.state === "low") return "Short on protein";
  if (line.key === "fat" && line.state === "low") return "Fat too low";
  if (line.key === "fat" && line.state === "high")
    return "Fat high, fine if calories fit";
  return null;
}

function remainingLabel(line: MacroLine): string {
  if (line.remaining > 0) return `${line.remaining}g left`;
  if (line.remaining < 0) return `${Math.abs(line.remaining)}g over`;
  return "on target";
}

export function MacroOverview({
  summary,
  profile,
}: {
  summary: { lines: MacroLine[]; kcal: number; kcalTarget: number };
  profile: Profile;
}) {
  const calories = summary.lines.find((l) => l.key === "calories")!;
  const bars = ["protein", "carbs", "fat"]
    .map((k) => summary.lines.find((l) => l.key === k)!)
    .filter(Boolean);

  return (
    <Surface className="p-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Calories</p>
          <p className="text-3xl font-semibold tabular-nums">
            {Math.round(summary.kcal)}
            <span className="ml-1 text-base font-normal text-muted-foreground">
              / {Math.round(summary.kcalTarget)}
            </span>
          </p>
        </div>
        {calories.state === "over" ? (
          <Pill tone="warn">Calories over</Pill>
        ) : calories.state === "under" ? (
          <Pill tone="muted">Low intake</Pill>
        ) : (
          <Pill tone="ok">In range</Pill>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {bars.map((line) => {
          const meta = META[line.key];
          const note = noteFor(line);
          const target =
            line.key === "fat"
              ? `${profile.fat_min}-${profile.fat_max}g`
              : `${line.target}g`;
          return (
            <div key={line.key}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{meta.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {line.current} / {target}
                </span>
              </div>
              <ProgressBar
                value={line.pct}
                barClassName={meta.bar}
                className="mt-1.5"
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {remainingLabel(line)}
                </span>
                {note ? (
                  <Pill tone={line.warn ? "warn" : "muted"}>{note}</Pill>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}
