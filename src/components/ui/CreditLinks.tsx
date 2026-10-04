import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const LINK =
  "inline-flex min-h-11 items-center text-eyebrow font-medium uppercase tracking-eyebrow transition-colors duration-(--dur-fast)";

export function CreditLinks({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-6",
        className,
      )}
    >
      <Link
        href="/privacy"
        className={cn(LINK, "text-muted-foreground hover:text-foreground")}
      >
        Privacy policy
      </Link>
      <a
        href="https://itsmatias.com"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(LINK, "group gap-1.5 text-foreground hover:text-primary")}
      >
        Built by itsmatias
        <ArrowUpRight
          size={12}
          strokeWidth={1.75}
          className="transition-transform duration-(--dur-fast) group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </a>
    </div>
  );
}
