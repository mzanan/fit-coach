import { cn } from "@/lib/utils";

export interface ColumnPoint {
  label: string;
  value: number | null;
}

export function ColumnChart({
  points,
  refValue,
  refLabel,
  unit,
  ariaLabel,
  className,
}: {
  points: ColumnPoint[];
  refValue?: number;
  refLabel?: string;
  unit: string;
  ariaLabel: string;
  className?: string;
}) {
  const values = points.map((p) => p.value ?? 0);
  const max = Math.max(...values, refValue ?? 0) * 1.12 || 1;
  const refPct = refValue ? (refValue / max) * 100 : null;

  return (
    <figure className={cn("w-full", className)}>
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
