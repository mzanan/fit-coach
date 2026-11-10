import { clamp, cn } from "@/lib/utils";

export function Ring({
  value,
  size = 168,
  stroke = 14,
  trackClassName,
  barClassName,
  className,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  trackClassName?: string;
  barClassName?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamp(value, 0, 100) / 100);

  return (
    <div
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        aria-hidden
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={cn("stroke-chart-track", trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ "--ring-c": c } as React.CSSProperties}
          className={cn(
            "animate-ring-fill stroke-brand transition-[stroke-dashoffset] duration-(--dur-data) ease-(--ease-out-soft) motion-reduce:animate-none",
            barClassName,
          )}
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}
