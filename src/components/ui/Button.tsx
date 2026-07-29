import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-medium transition-[background-color,color,transform,box-shadow] duration-(--dur-fast) ease-(--ease-out-soft) select-none active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        solid:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
        outline: "border border-hairline-strong bg-transparent hover:bg-overlay",
        ghost: "text-muted-foreground hover:bg-overlay hover:text-foreground",
        danger:
          "text-muted-foreground hover:bg-destructive-soft hover:text-destructive",
        destructive:
          "bg-destructive-surface text-destructive-foreground hover:bg-destructive-surface-hover",
      },
      size: {
        sm: "h-9 px-3.5 text-meta",
        md: "h-11 px-5 text-body",
        lg: "h-13 px-6 text-body",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: { variant: "solid", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button";
    return (
      <Comp
        ref={ref}
        className={cn(button({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
