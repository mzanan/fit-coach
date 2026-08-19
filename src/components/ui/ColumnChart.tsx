import { cn } from "@/lib/utils";
import {
  buildTrendSegments,
  computeTrendDomain,
  trendValueToY,
} from "@/lib/trendChart";

export interface ColumnPoint {
  label: string;
  value: number | null;
}

export type ColumnChartVariant = "columns" | "trend";

export function ColumnChart({
  points,
  refValue,
  refLabel,
  unit,
  ariaLabel,
  variant = "columns",
  className,
}: {
  points: ColumnPoint[];
  refValue?: number;
  refLabel?: string;
  unit: string;
  ariaLabel: string;
  variant?: ColumnChartVariant;
  className?: string;
}) {
  return (
    <figure className={cn("w-full", className)}>
      {variant === "trend" ? (
        <TrendMarks
          points={points}
          refValue={refValue}
          refLabel={refLabel}
          ariaLabel={ariaLabel}
        />
      ) : (
        <ColumnMarks
          points={points}
          refValue={refValue}
          refLabel={refLabel}
          ariaLabel={ariaLabel}
        />
      )}

      <div className="mt-2 flex gap-[3px]">
        {points.map((p, i) => (
          <span
            key={`${p.label}-label-${i}`}
            className="flex-1 text-center text-eyebrow text-faint"
          >
            {i % 2 === 0 ? p.label : ""}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>
          {points.map((p, i) => (
            <tr key={`${p.label}-row-${i}`}>
              <th scope="row">{p.label}</th>
              <td>{p.value == null ? "no data" : `${p.value} ${unit}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function ColumnMarks({
  points,
  refValue,
  refLabel,
  ariaLabel,
}: {
  points: ColumnPoint[];
  refValue?: number;
  refLabel?: string;
  ariaLabel: string;
}) {
  const values = points.map((p) => p.value ?? 0);
  const max = Math.max(...values, refValue ?? 0) * 1.12 || 1;
  const refPct = refValue ? (refValue / max) * 100 : null;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="relative flex h-28 items-end gap-[3px]"
    >
      {refPct !== null ? (
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-chart-ref"
          style={{ bottom: `${refPct}%` }}
        >
          {refLabel ? (
            <span className="absolute -top-4 right-0 text-eyebrow text-faint">
              {refLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      {points.map((p, i) => {
        const empty = p.value == null || p.value === 0;
        const height = empty ? 2 : Math.max(3, ((p.value ?? 0) / max) * 100);
        return (
          <div
            key={`${p.label}-${i}`}
            className="flex flex-1 items-end"
            style={{ height: "100%" }}
          >
            <div
              className={cn(
                "w-full rounded-t-[3px]",
                empty ? "bg-chart-track" : "bg-macro-protein",
              )}
              style={{ height: empty ? "2px" : `${height}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function TrendMarks({
  points,
  refValue,
  refLabel,
  ariaLabel,
}: {
  points: ColumnPoint[];
  refValue?: number;
  refLabel?: string;
  ariaLabel: string;
}) {
  const values = points.map((p) => p.value);
  const nonNullValues = values.filter(
    (v): v is number => v != null,
  );
  const domain = computeTrendDomain(nonNullValues);
  const segments = buildTrendSegments(values, domain);
  const marks = segments.flat();
  const refY =
    refValue != null ? trendValueToY(refValue, domain) : null;

  return (
    <div role="img" aria-label={ariaLabel} className="relative h-28">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 border-b border-hairline" />

      {refY !== null ? (
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-chart-ref"
          style={{ top: `${refY}%` }}
        >
          {refLabel ? (
            <span className="absolute -top-4 right-0 text-eyebrow text-faint">
              {refLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {segments.map((segment, segmentIndex) =>
          segment.length > 1 ? (
            <polyline
              key={`segment-${segmentIndex}`}
              points={segment.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="animate-in fade-in"
              style={{
                animationDuration: "500ms",
                animationFillMode: "backwards",
              }}
            />
          ) : null,
        )}
      </svg>

      <svg className="absolute inset-0 h-full w-full">
        {marks.map((mark, i) => (
          <circle
            key={`mark-${mark.index}`}
            cx={`${mark.x}%`}
            cy={`${mark.y}%`}
            r={3}
            fill="var(--color-brand)"
            stroke="var(--color-surface-1)"
            strokeWidth={2}
            className="animate-in fade-in"
            style={{
              animationDuration: "400ms",
              animationTimingFunction: "var(--ease-out-soft)",
              animationDelay: `${i * 40}ms`,
              animationFillMode: "backwards",
            }}
          />
        ))}
      </svg>
    </div>
  );
}
