import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

import { FIELD_BASE } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

const textarea = cva(`p-3.5 ${FIELD_BASE}`, {
  variants: {
    size: {
      sm: "min-h-24 field-sizing-content",
      md: "min-h-40",
      editor: "min-h-[60vh]",
    },
    mono: {
      true: "font-mono text-meta sm:text-meta",
      false: "",
    },
  },
  defaultVariants: { size: "md", mono: false },
});

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textarea> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size, mono, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(textarea({ size, mono }), className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
