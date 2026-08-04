import { Surface } from "@/components/ui/Surface";
import type { MacroLine } from "@/lib/macros";

const LABEL: Record<string, string> = {
  protein: "Protein",
  fat: "Fat",
  carbs: "Carbs",
  calories: "Kcal",
};

function Row({ line, unit }: { line: MacroLine; unit: string }) {
  const remaining = line.target - line.current;
  return (
    <div className="grid grid-cols-4 gap-2 text-meta">
      <span className="text-muted-foreground">{LABEL[line.key]}</span>
      <span className="num text-right">
        {line.current}
        {unit}
      </span>
      <span className="num text-right text-faint">
        / {line.target}
        {unit}
      </span>
      <span
        className={`num text-right ${remaining < 0 ? "text-brand" : "text-muted-foreground"}`}
      >
        {remaining < 0 ? `+${Math.abs(remaining)}` : remaining}
        {unit}
      </span>
    </div>
  );
}

export function MacroTable({
  summary,
}: {
  summary: { lines: MacroLine[]; kcal: number; kcalTarget: number };
}) {
  const order = ["protein", "fat", "carbs", "calories"];
  const lines = order
    .map((key) => summary.lines.find((line) => line.key === key))
    .filter((line): line is MacroLine => Boolean(line));

  return (
    <Surface level="flat" radius="lg" className="p-3">
      <div className="grid grid-cols-4 gap-2 text-eyebrow text-faint">
        <span>Macro</span>
        <span className="text-right">Now</span>
        <span className="text-right">Target</span>
        <span className="text-right">Left</span>
      </div>
      <div className="mt-1.5 space-y-1">
        {lines.map((line) => (
          <Row key={line.key} line={line} unit={line.key === "calories" ? "" : "g"} />
        ))}
      </div>
    </Surface>
  );
}
