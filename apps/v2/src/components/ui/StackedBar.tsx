import { cn } from "@/lib/utils";

export interface BarSegment {
  label: string;
  value: number;
  className: string;
}

export function StackedBar({
  segments,
  unit,
  ariaLabel,
  className,
}: {
  segments: BarSegment[];
  unit: string;
  ariaLabel: string;
  className?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <figure className={cn("w-full", className)}>
      <div role="img" aria-label={ariaLabel} className="flex h-2.5 gap-[2px]">
        {segments.map((s) => (
          <div
            key={s.label}
            className={cn("h-full first:rounded-l-full last:rounded-r-full", s.className)}
            style={{ width: `${(s.value / total) * 100}%` }}
          />
        ))}
      </div>

      <ul className="mt-3.5 space-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 text-meta">
            <span className={cn("size-1.5 shrink-0 rounded-full", s.className)} />
            <span className="flex-1 text-muted-foreground">{s.label}</span>
            <span className="text-foreground">
              <span className="num">{s.value.toFixed(1)}</span>
              <span className="ml-0.5 font-sans text-faint">{unit}</span>
            </span>
            <span className="w-10 text-right text-faint">
              <span className="num">{Math.round((s.value / total) * 100)}</span>%
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
