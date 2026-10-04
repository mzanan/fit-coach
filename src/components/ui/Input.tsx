import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export const FIELD_BASE =
  "w-full rounded-control border border-input bg-field text-input outline-none transition-[border-color,box-shadow] duration-(--dur-fast) ease-(--ease-out-soft) placeholder:text-faint focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-brand-soft aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive-soft disabled:opacity-40 sm:text-body";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn("h-12 px-3.5", FIELD_BASE, className)}
    {...props}
  />
));
Input.displayName = "Input";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("eyebrow mb-1.5 block", className)} {...props} />;
}

export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-meta text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-meta text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
