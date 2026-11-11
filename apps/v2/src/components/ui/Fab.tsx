import { forwardRef } from "react";

import { Button, type ButtonProps } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export const Fab = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "size" | "variant"> & { "aria-label": string }
>(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    size="fab"
    className={cn(
      "fixed right-gutter bottom-[calc(var(--spacing-nav)+var(--spacing-safe-b)+1.75rem)] z-40 animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards delay-(--stagger-3) duration-(--dur-slow) ease-(--ease-out-soft) md:hidden",
      className,
    )}
    {...props}
  />
));
Fab.displayName = "Fab";
