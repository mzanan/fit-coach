import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  action,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-1", className)}>
      {backHref ? (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="-ml-2 shrink-0"
        >
          <Link href={backHref} aria-label={backLabel}>
            <ChevronLeft className="size-5" strokeWidth={1.5} />
          </Link>
        </Button>
      ) : null}
      <div className={cn(backHref && "pt-1.5")}>
        <h1 className="text-h1 font-medium tracking-(--tracking-snug)">{title}</h1>
        {description ? (
          <p className="mt-1 text-meta text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}
