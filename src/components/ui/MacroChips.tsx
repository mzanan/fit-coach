import { kcalOf, type Macros } from "@/lib/macros";
import { cn } from "@/lib/utils";

function Value({ n, unit }: { n: number; unit: string }) {
  return (
    <span className="text-foreground">
      <span className="num">{Math.round(n)}</span>
      <span className="ml-0.5 font-sans text-faint">{unit}</span>
    </span>
  );
}

export function MacroChips({
  macros,
  className,
}: {
  macros: Macros;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-2.5 text-meta", className)}
    >
      <Value n={macros.protein_g} unit="P" />
      <Value n={macros.carbs_g} unit="C" />
      <Value n={macros.fat_g} unit="F" />
      <span className="text-faint">
        <span className="num">{Math.round(kcalOf(macros))}</span>
        <span className="ml-0.5 font-sans">kcal</span>
      </span>
    </div>
  );
}
