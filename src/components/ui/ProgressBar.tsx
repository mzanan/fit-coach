import { cn } from "@/lib/utils";
import { clamp } from "@/lib/utils";

export function ProgressBar({
  value,
  barClassName,
  className,
}: {
  value: number;
  barClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all", barClassName)}
        style={{ width: `${clamp(value, 0, 100)}%` }}
      />
    </div>
  );
}
