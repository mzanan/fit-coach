import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

const SIZE = {
  sm: "text-metric",
  md: "text-h1",
  hero: "text-hero tracking-(--tracking-hero)",
} as const;

export function Stat({
  label,
  value,
  unit,
  hint,
  delta,
  size = "sm",
  className,
}: {
  label: string;
  value: string | number | null;
  unit?: string;
  hint?: string;
  delta?: { value: number; goodDirection: "up" | "down"; unit?: string };
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const missing = value == null || value === "";
  const rising = delta ? delta.value > 0 : false;
  const good = delta
    ? delta.value === 0
      ? null
      : (rising && delta.goodDirection === "up") ||
        (!rising && delta.goodDirection === "down")
    : null;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <p className="eyebrow min-h-[2.1em] leading-[1.05]">{label}</p>
      <p className={cn("mt-1.5 font-medium", SIZE[size])}>
        {missing ? (
          <span className="text-faint">--</span>
        ) : (
          <>
            <span className="num">{value}</span>
            {unit ? (
              <span className="ml-1 font-sans text-meta font-normal text-faint">
                {unit}
              </span>
            ) : null}
          </>
        )}
      </p>
      {delta && delta.value !== 0 ? (
        <p
          className={cn(
            "mt-auto flex items-center gap-0.5 pt-1 text-meta",
            good === true ? "text-foreground" : "text-brand",
          )}
        >
          {rising ? (
            <ArrowUp className="size-3.5" strokeWidth={1.5} />
          ) : (
            <ArrowDown className="size-3.5" strokeWidth={1.5} />
          )}
          <span className="num">{Math.abs(delta.value)}</span>
          {delta.unit ? (
            <span className="font-sans text-faint">{delta.unit}</span>
          ) : null}
        </p>
      ) : hint ? (
        <p className="mt-auto pt-1 text-meta text-faint">
          {missing ? "Not on the sheet" : hint}
        </p>
      ) : missing ? (
        <p className="mt-auto pt-1 text-meta text-faint">Not on the sheet</p>
      ) : null}
    </div>
  );
}
