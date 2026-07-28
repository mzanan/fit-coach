import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

export function ListGroup({
  label,
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label ? <p className="eyebrow px-1 pb-2.5">{label}</p> : null}
      <Surface radius="xl" className="divide-y divide-border overflow-hidden">
        {children}
      </Surface>
    </div>
  );
}

export function ListRow({
  href,
  onClick,
  icon: Icon,
  label,
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
      <Icon
        aria-hidden
        className={cn(
          "size-[18px] shrink-0",
          tone === "danger" ? "text-destructive" : "text-muted-foreground",
        )}
        strokeWidth={1.5}
      />
      <span className={cn("text-body", tone === "danger" && "text-destructive")}>
        {pending ? `${label}...` : label}
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
