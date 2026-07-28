import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const chip = cva(
  "inline-flex items-center justify-center rounded-full px-3.5 font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-(--dur-fast) ease-(--ease-out-soft) active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      size: {
        md: "h-11 text-meta",
        sm: "h-9 text-eyebrow",
      },
      tone: {
        brand: "",
        neutral: "",
      },
      pressed: {
        true: "",
        false: "border border-hairline-strong text-muted-foreground",
      },
    },
    compoundVariants: [
      { tone: "brand", pressed: true, className: "bg-brand text-brand-foreground" },
      { tone: "neutral", pressed: true, className: "bg-primary text-primary-foreground" },
    ],
    defaultVariants: { size: "md", tone: "neutral", pressed: false },
  },
);

export interface ToggleChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">,
    VariantProps<typeof chip> {
  pressedState: boolean;
  onPressedChange: (value: boolean) => void;
}

export function ToggleChip({
  className,
  size,
  tone,
  pressedState,
  onPressedChange,
  ...props
}: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressedState}
      onClick={() => onPressedChange(!pressedState)}
      className={cn(chip({ size, tone, pressed: pressedState }), className)}
      {...props}
    />
  );
}
