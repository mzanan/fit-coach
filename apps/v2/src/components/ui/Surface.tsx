import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const surface = cva("border border-border", {
  variants: {
    level: {
      flat: "bg-card surface-edge",
      raised: "bg-card surface-edge-raised",
      hero: "bg-card surface-edge-raised surface-hero",
      sunken: "bg-well shadow-inset",
    },
    radius: {
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
    },
    pad: {
      none: "",
      inset: "p-2",
      tight: "p-tight",
      compact: "p-card-compact",
      default: "p-card",
    },
    list: {
      true: "divide-y divide-border overflow-hidden",
      false: "",
    },
  },
  defaultVariants: { level: "flat", radius: "xl", pad: "default", list: false },
});

export interface SurfaceProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surface> {}

export function Surface({
  className,
  level,
  radius,
  pad,
  list,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        surface({ level, radius, pad: list ? "none" : pad, list }),
        className,
      )}
      {...props}
    />
  );
}
