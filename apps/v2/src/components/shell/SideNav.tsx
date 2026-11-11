"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SIDE_NAV_ITEMS, isNavActive } from "@/components/shell/navItems";
import { useRail } from "@/components/shell/useRail";
import { BrandMark } from "@/components/ui/BrandMark";
import { cn } from "@/lib/utils";

export function SideNav() {
  const pathname = usePathname();
  const { collapsed } = useRail();
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-hairline bg-card/40 px-4 pb-4 whitespace-nowrap transition-[width] duration-(--dur-slow) ease-(--ease-in-out-soft) md:flex",
        collapsed ? "w-rail-collapsed" : "w-rail",
      )}
    >
      <div className="-mx-4 mb-6 flex h-nav shrink-0 items-center border-b border-hairline pl-6.5">
        <BrandMark href="/" iconOnly={collapsed} />
      </div>
      <nav className="flex flex-col gap-1">
        {SIDE_NAV_ITEMS.map((tab) => {
          const active = isNavActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? tab.label : undefined}
              className={cn(
                "flex h-12 items-center gap-3 overflow-hidden rounded-full px-3.5 text-body font-medium transition-[width,background-color,color] duration-(--dur-slow) ease-(--ease-in-out-soft)",
                collapsed ? "w-12" : "w-full",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-overlay hover:text-foreground",
              )}
            >
              <Icon
                className="size-5 shrink-0"
                strokeWidth={active ? 2 : 1.5}
              />
              <span
                className={cn(
                  "transition-opacity duration-(--dur-base) ease-(--ease-in-out-soft)",
                  collapsed && "opacity-0",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
