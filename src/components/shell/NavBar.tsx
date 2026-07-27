"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_TABS, isNavActive } from "@/components/shell/navItems";
import { cn } from "@/lib/utils";

export function NavBar({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav
      className={cn(
        "hairline-t sticky bottom-0 z-40 bg-background/80 backdrop-blur-xl",
        className,
      )}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV_TABS.map((tab) => {
          const active = isNavActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-eyebrow font-medium transition-colors duration-(--dur-fast) ease-(--ease-out-soft)",
                active ? "text-brand" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 1.75 : 1.5} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
