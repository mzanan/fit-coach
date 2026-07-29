import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pill = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-eyebrow font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        brand: "bg-brand-soft text-brand-ink",
        muted: "bg-overlay text-muted-foreground",
      },
      variant: {
        soft: "",
        solid: "",
      },
    },
    compoundVariants: [
      { variant: "solid", tone: "brand", className: "bg-brand text-brand-foreground" },
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
