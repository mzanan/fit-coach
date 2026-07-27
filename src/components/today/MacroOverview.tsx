import { ProgressBar } from "@/components/ui/ProgressBar";
import { Surface } from "@/components/ui/Surface";
import type { Profile } from "@/lib/db/schema";
import type { MacroLine } from "@/lib/macros";

const META: Record<string, { label: string; bar: string }> = {
  protein: { label: "Protein", bar: "bg-macro-protein" },
  carbs: { label: "Carbs", bar: "bg-macro-carbs" },
  fat: { label: "Fat", bar: "bg-macro-fat" },
};

function topNote(lines: MacroLine[]): string | null {
  const protein = lines.find((l) => l.key === "protein");
  if (protein?.state === "low") return "Short on protein";
  const fat = lines.find((l) => l.key === "fat");
  if (fat?.state === "low") return "Fat too low";
  return null;
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

  const remaining = Math.round(summary.kcalTarget - summary.kcal);
  const over = remaining < 0;
  const note = topNote(summary.lines);

  return (
    <Surface level="raised" className="p-5">
      <p className="eyebrow">{over ? "Over today" : "Remaining today"}</p>

      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`num text-hero font-semibold tracking-[--tracking-hero] ${
            over ? "text-brand" : "text-foreground"
          }`}
        >
          {over ? `+${Math.abs(remaining)}` : remaining}
        </span>
        <span className="text-meta text-faint">
          of <span className="num">{Math.round(summary.kcalTarget)}</span> kcal
        </span>
      </div>

      <ProgressBar
        value={calories.pct}
        size="xs"
        barClassName={over ? "bg-brand" : "bg-foreground/70"}
        className="mt-3.5"
      />

      <div className="mt-5 grid grid-cols-3 gap-4">
        {bars.map((line) => {
          const meta = META[line.key];
          const target =
            line.key === "fat"
              ? `${profile.fat_min}-${profile.fat_max}`
              : `${line.target}`;
          return (
            <div key={line.key}>
              <p className="eyebrow">{meta.label}</p>
              <p className="mt-1.5 text-metric">
                <span className="num">{line.current}</span>
                <span className="ml-1 text-meta text-faint">
                  / <span className="num">{target}</span>g
                </span>
              </p>
              <ProgressBar
                value={line.pct}
                size="xs"
                barClassName={meta.bar}
                className="mt-2.5"
              />
            </div>
          );
        })}
      </div>

      {note ? (
        <p className="mt-5 text-meta text-brand">{note}</p>
      ) : calories.state === "under" ? (
        <p className="mt-5 text-meta text-muted-foreground">
          Low intake so far today.
        </p>
      ) : null}
    </Surface>
  );
}
