import { MacroSummaryCard } from "@/components/ui/MacroSummaryCard";
import { HERO_KCAL_PCT, HERO_MACROS, HERO_REMAINING } from "@/lib/landingDemo";

export function MacroPreview({ className }: { className?: string }) {
  return (
    <MacroSummaryCard
      role="img"
      aria-label={`Example of the Today screen: ${HERO_REMAINING} of ${HERO_MACROS.kcalTarget} kcal remaining, with protein, carbs and fat progress against targets.`}
      remaining={HERO_REMAINING}
      over={false}
      kcalTarget={HERO_MACROS.kcalTarget}
      kcalPct={HERO_KCAL_PCT}
      lines={[...HERO_MACROS.bars]}
      note={`${HERO_MACROS.proteinLeft} g protein left for today.`}
      animate
      className={className}
    />
  );
}
