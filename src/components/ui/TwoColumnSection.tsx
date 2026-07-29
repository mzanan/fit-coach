import { cn } from "@/lib/utils";

const SPAN = {
  5: "lg:col-span-5",
  7: "lg:col-span-7",
} as const;

const GAP = {
  6: "lg:gap-6",
  8: "lg:gap-8",
} as const;

const STACK_GAP = {
  3: "mt-3",
  7: "mt-7",
} as const;

const ENTRANCE =
  "lg:animate-in lg:fade-in lg:slide-in-from-bottom-2 lg:fill-mode-backwards lg:duration-(--dur-slow) lg:ease-(--ease-out-soft)";

export function TwoColumnSection({
  left,
  leftSpan,
  leftSticky = false,
  right,
  rightSpan,
  gap = 8,
  stackGap = 7,
  className,
}: {
  left: React.ReactNode;
  leftSpan: keyof typeof SPAN;
  leftSticky?: boolean;
  right: React.ReactNode;
  rightSpan: keyof typeof SPAN;
  gap?: keyof typeof GAP;
  stackGap?: keyof typeof STACK_GAP;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "lg:grid lg:grid-cols-12 lg:items-start",
        GAP[gap],
        className,
      )}
    >
      <div
        className={cn(
          ENTRANCE,
          SPAN[leftSpan],
          leftSticky && "lg:sticky lg:top-gutter",
        )}
      >
        {left}
      </div>
      <div
        className={cn(
          STACK_GAP[stackGap],
          "lg:mt-0",
          ENTRANCE,
          "lg:delay-(--stagger-1)",
          SPAN[rightSpan],
        )}
      >
        {right}
      </div>
    </div>
  );
}
