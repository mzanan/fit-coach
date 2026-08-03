import {
  hasAnyMacro,
  hasMacros,
  kcalOf,
  known,
  type PartialMacros,
} from "@/lib/macros";
import { cn } from "@/lib/utils";

function Value({
  n,
  unit,
}: {
  n: number | null | undefined;
  unit: string;
}) {
  return (
    <span className={known(n) ? "text-foreground" : "text-faint"}>
      <span className="num">{known(n) ? Math.round(n) : "?"}</span>
      <span className="ml-0.5 font-sans text-faint">{unit}</span>
    </span>
  );
}

export function MacroChips({
  macros,
  className,
}: {
  macros: PartialMacros;
  className?: string;
}) {
  if (!hasAnyMacro(macros)) {
    return (
      <p className={cn("text-meta text-muted-foreground", className)}>
        Macros not set
      </p>
    );
  }

  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-2.5 text-meta", className)}
    >
      <Value n={macros.protein_g} unit="P" />
      <Value n={macros.carbs_g} unit="C" />
      <Value n={macros.fat_g} unit="F" />
      {hasMacros(macros) ? (
        <span className="text-faint">
          <span className="num">{Math.round(kcalOf(macros))}</span>
          <span className="ml-0.5 font-sans">kcal</span>
        </span>
      ) : null}
    </div>
  );
}
