import { MACRO_TONE, type MacroKey } from "@/components/ui/macroTone";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Ring } from "@/components/ui/Ring";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

export interface MacroSummaryLine {
  key: MacroKey;
  label: string;
  current: number;
  target: string;
  pct: number;
}

export function MacroSummaryCard({
  remaining,
  over,
  kcalTarget,
  kcalPct,
  lines,
  note,
  animate,
  className,
  ...props
}: {
  remaining: number;
  over: boolean;
  kcalTarget: number;
  kcalPct: number;
  lines: MacroSummaryLine[];
  note?: React.ReactNode;
  animate?: boolean;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className">) {
  return (
    <Surface level="hero" className={className} {...props}>

      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <Ring
          value={kcalPct}
          size={176}
          stroke={14}
          barClassName={cn(over && "stroke-macro-fat", animate && "[--bar-delay:var(--delay-hero-data)]")}
        >
          <p className="eyebrow">{over ? "kcal over" : "kcal left"}</p>
          <p className="num mt-1 text-hero font-semibold tracking-(--tracking-hero)">
            {over ? `+${Math.abs(remaining)}` : remaining}
          </p>
          <p className="mt-1 text-meta text-muted-foreground">
            of <span className="num">{kcalTarget}</span>
          </p>
        </Ring>

        <div className="w-full flex-1 space-y-4">
          {lines.map((line, i) => (
            <div key={line.key}>
              <div className="flex items-baseline gap-2">
                <span
                  aria-hidden
                  className={cn("size-2 shrink-0 rounded-full", MACRO_TONE[line.key].dot)}
                />
                <span className="text-meta font-medium text-muted-foreground">
                  {line.label}
                </span>
                <span className="ml-auto whitespace-nowrap">
                  <span className="num text-title font-semibold">{line.current}</span>
                  <span className="ml-1 text-meta text-faint">
                    / <span className="num">{line.target}</span> g
                  </span>
                </span>
              </div>
              <ProgressBar
                value={line.pct}
                size="md"
                className="mt-2"
                barClassName={cn(
                  MACRO_TONE[line.key].bar,
                  animate && "animate-bar-fill motion-reduce:animate-none",
                  animate && i === 0 && "[--bar-delay:calc(var(--delay-hero-data)+var(--stagger-1))]",
                  animate && i === 1 && "[--bar-delay:calc(var(--delay-hero-data)+var(--stagger-2))]",
                  animate && i === 2 && "[--bar-delay:calc(var(--delay-hero-data)+var(--stagger-3))]",
                )}
              />
            </div>
          ))}
        </div>
      </div>

      {note ? (
        <p className="relative mt-5 border-t border-hairline pt-4 text-meta text-brand-ink">
          {note}
        </p>
      ) : null}
    </Surface>
  );
}
