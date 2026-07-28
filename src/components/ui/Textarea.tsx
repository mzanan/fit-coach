import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-40 w-full rounded-md border border-input bg-field p-3.5 text-body outline-none transition-[border-color,box-shadow] duration-(--dur-fast) ease-(--ease-out-soft) placeholder:text-faint focus-visible:border-brand-line focus-visible:ring-2 focus-visible:ring-ring/40",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
