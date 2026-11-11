"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_TABS, isNavActive } from "@/components/shell/navItems";
import { cn } from "@/lib/utils";

export function NavBar({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav
      data-slot="nav-bar"
      className={cn(
        "sticky bottom-0 z-40 bg-linear-to-t from-background via-background/90 to-transparent px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]",
        className,
      )}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-between rounded-full border border-hairline-strong bg-popover/85 p-1.5 shadow-raised backdrop-blur-xl">
        {NAV_TABS.map((tab) => {
          const active = isNavActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-13 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-eyebrow font-medium transition-colors duration-(--dur-base) ease-(--ease-out-soft)",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2 : 1.5} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
