"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { activeNavItem } from "@/components/shell/navItems";
import { cn } from "@/lib/utils";

export function SectionCrumb({ className }: { className?: string }) {
  const item = activeNavItem(usePathname());
  if (!item) return null;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex min-h-11 shrink-0 items-center gap-2.5 text-body font-medium text-foreground",
        className,
      )}
    >
      <Icon
        className="size-[18px] text-muted-foreground transition-colors duration-(--dur-fast) group-hover:text-foreground"
        strokeWidth={1.5}
      />
      {item.label}
    </Link>
  );
}
