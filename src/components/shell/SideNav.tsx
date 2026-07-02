"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_TABS, isNavActive } from "@/components/shell/navItems";
import { cn } from "@/lib/utils";

export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border px-3 py-5 md:flex">
      <div className="flex items-center gap-2 px-3 pb-5">
        <span className="text-lg font-semibold">Fit Coach</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_TABS.map((tab) => {
          const active = isNavActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
