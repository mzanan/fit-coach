import {
  hasAnyMacro,
  hasMacros,
  kcalOf,
  known,
  type PartialMacros,
} from "@/lib/macros";
import { MACRO_TONE, type MacroKey } from "@/components/ui/macroTone";
import { cn } from "@/lib/utils";

function Value({
  n,
  unit,
  tone,
}: {
  n: number | null | undefined;
  unit: string;
  tone: MacroKey;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        known(n) ? "text-foreground" : "text-faint",
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", MACRO_TONE[tone].dot)} />
      <span className="num">{known(n) ? Math.round(n) : "?"}</span>
      <span className="-ml-1 font-sans text-faint">{unit}</span>
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
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-meta", className)}
    >
      <Value n={macros.protein_g} unit="P" tone="protein" />
      <Value n={macros.carbs_g} unit="C" tone="carbs" />
      <Value n={macros.fat_g} unit="F" tone="fat" />
      {hasMacros(macros) ? (
        <span className="text-faint">
          <span className="num">{Math.round(kcalOf(macros))}</span>
          <span className="ml-0.5 font-sans">kcal</span>
        </span>
      ) : null}
    </div>
  );
}
