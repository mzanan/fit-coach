import { cn } from "@/lib/utils";
import { clamp } from "@/lib/utils";

const SIZE = {
  xs: "h-[3px]",
  sm: "h-1",
  md: "h-1.5",
} as const;

export function ProgressBar({
  value,
  size = "md",
  barClassName,
  className,
}: {
  value: number;
  size?: keyof typeof SIZE;
  barClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-black/30 shadow-[inset_0_1px_2px_oklch(0_0_0_/_0.5)]",
        SIZE[size],
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-[--dur-data] ease-[--ease-out-soft]",
          barClassName,
        )}
        style={{ width: `${clamp(value, 0, 100)}%` }}
      />
    </div>
  );
}
