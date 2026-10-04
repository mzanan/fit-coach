import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Surface } from "@/components/ui/Surface";
import { staggerDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function ListGroup({
  label,
  enterIndex,
  children,
  className,
}: {
  label?: string;
  enterIndex?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        enterIndex !== undefined &&
          "animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-(--dur-slow) ease-(--ease-out-soft)",
        className,
      )}
      style={enterIndex !== undefined ? staggerDelay(enterIndex) : undefined}
    >
      {label ? <p className="eyebrow px-1 pb-2.5">{label}</p> : null}
      <Surface list>{children}</Surface>
    </div>
  );
}

export function ListRow({
  href,
  onClick,
  icon: Icon,
  label,
  hint,
  value,
  tone = "default",
  chevron,
  disabled,
  pending,
}: {
  href?: string;
  onClick?: () => void;
  icon: LucideIcon;
  label: string;
  hint?: string;
  value?: string;
  tone?: "default" | "danger";
  chevron?: boolean;
  disabled?: boolean;
  pending?: boolean;
}) {
  const showChevron = chevron ?? Boolean(href);
  const className = cn(
    "flex min-h-14 w-full items-center gap-3 px-card text-left transition-colors duration-(--dur-fast) ease-(--ease-out-soft) active:bg-overlay focus-visible:bg-overlay focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
  );

  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          tone === "danger" ? "bg-destructive-soft" : "bg-overlay",
        )}
      >
        <Icon
          className={cn(
            "size-[18px]",
            tone === "danger" ? "text-destructive" : "text-foreground",
          )}
          strokeWidth={1.75}
        />
      </span>
      <span className="min-w-0 py-2.5">
        <span
          className={cn(
            "block text-body",
            tone === "danger" && "text-destructive",
          )}
        >
          {pending ? `${label}...` : label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-meta text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
      {value ? (
        <span className="ml-auto max-w-[45%] truncate text-meta text-muted-foreground">
          {value}
        </span>
      ) : null}
      {showChevron ? (
        <ChevronRight
          aria-hidden
          className={cn("size-4 shrink-0 text-faint", value ? "ml-1" : "ml-auto")}
        />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {content}
    </button>
  );
}
