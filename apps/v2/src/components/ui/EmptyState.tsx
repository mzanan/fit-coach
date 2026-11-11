import type { LucideIcon } from "lucide-react";

import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  children,
  size = "md",
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  size?: "md" | "sm";
  className?: string;
}) {
  return (
    <Surface
      level="sunken"
      pad="none"
      role="status"
      className={cn(
        "animate-in fade-in text-center duration-(--dur-slow) ease-(--ease-out-soft)",
        size === "md" ? "px-6 py-10" : "px-5 py-8",
        className,
      )}
    >
      {Icon ? (
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-soft">
          <Icon aria-hidden className="size-5 text-brand-ink" strokeWidth={1.75} />
        </span>
      ) : null}
      <p className="text-body">{title}</p>
      {body ? (
        <p className="mx-auto mt-1.5 max-w-[32ch] text-meta text-muted-foreground">
          {body}
        </p>
      ) : null}
      {children}
      {action ? <div className="mt-5">{action}</div> : null}
    </Surface>
  );
}
