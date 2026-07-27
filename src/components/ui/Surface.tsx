import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const surface = cva("border border-border", {
  variants: {
    level: {
      flat: "bg-card surface-edge",
      raised: "bg-card surface-edge-raised",
      sunken: "bg-black/25 shadow-[inset_0_1px_3px_oklch(0_0_0_/_0.6)]",
    },
    radius: {
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
    },
  },
  defaultVariants: { level: "flat", radius: "xl" },
});

export interface SurfaceProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surface> {}

export function Surface({ className, level, radius, ...props }: SurfaceProps) {
  return (
    <div className={cn(surface({ level, radius }), className)} {...props} />
  );
}
