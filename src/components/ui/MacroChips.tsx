import { kcalOf, type Macros } from "@/lib/macros";
import { cn } from "@/lib/utils";

export function MacroChips({
  macros,
  className,
}: {
  macros: Macros;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 text-xs", className)}>
      <span className="font-medium text-macro-protein">
        {Math.round(macros.protein_g)}P
      </span>
      <span className="font-medium text-macro-carbs">
        {Math.round(macros.carbs_g)}C
      </span>
      <span className="font-medium text-macro-fat">
        {Math.round(macros.fat_g)}F
      </span>
      <span className="text-muted-foreground">{Math.round(kcalOf(macros))} kcal</span>
    </div>
  );
}
