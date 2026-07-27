"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SIDE_NAV_ITEMS, isNavActive } from "@/components/shell/navItems";
import { cn } from "@/lib/utils";

export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border px-3 py-5 md:flex">
      <div className="flex items-center gap-2 px-3 pb-5">
        <span className="text-title font-medium tracking-(--tracking-snug)">Fit Coach</span>
      </div>
      <nav className="flex flex-col gap-1">
        {SIDE_NAV_ITEMS.map((tab) => {
          const active = isNavActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-body font-medium transition-colors duration-(--dur-fast)",
                active
                  ? "bg-overlay text-brand"
                  : "text-muted-foreground hover:bg-overlay",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 1.75 : 1.5} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
