import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pill = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        brand: "bg-primary/12 text-primary",
        ok: "bg-ok/15 text-ok",
        warn: "bg-warn/15 text-warn",
        muted: "bg-muted text-muted-foreground",
      },
      variant: {
        soft: "",
        solid: "",
      },
    },
    compoundVariants: [
      { variant: "solid", tone: "brand", className: "bg-primary text-primary-foreground" },
      { variant: "solid", tone: "ok", className: "bg-ok text-white" },
      { variant: "solid", tone: "warn", className: "bg-warn text-white" },
    ],
    defaultVariants: { tone: "muted", variant: "soft" },
  },
);

export interface PillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pill> {}

export function Pill({ className, tone, variant, ...props }: PillProps) {
  return <span className={cn(pill({ tone, variant }), className)} {...props} />;
}
