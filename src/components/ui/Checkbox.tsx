"use client";

import { cn } from "@/lib/utils";

export function Checkbox({
  checked,
  onChange,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> & {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className={cn(
        "size-4 shrink-0 cursor-pointer rounded border-border accent-primary",
        className,
      )}
      {...props}
    />
  );
}
