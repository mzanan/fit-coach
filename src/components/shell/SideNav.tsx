"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ActiveModelLabel } from "@/components/shell/ActiveModelLabel";
import { SIDE_NAV_ITEMS, isNavActive } from "@/components/shell/navItems";
import { UserMenu } from "@/components/shell/UserMenu";
import { BrandMark } from "@/components/ui/BrandMark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { AiCredential } from "@/lib/ai/aiCredentials";
import type { SessionUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export function SideNav({
  user,
  activeModel,
}: {
  user: SessionUser;
  activeModel: AiCredential | null;
}) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-rail shrink-0 flex-col border-r border-hairline bg-card/40 px-3 pt-gutter pb-4 md:flex">
      <div className="px-2 pb-8">
        <BrandMark href="/" />
        <ActiveModelLabel
          credential={activeModel}
          className="mt-1 block truncate pl-[2.375rem]"
        />
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
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-full px-4 text-body font-medium transition-[background-color,color] duration-(--dur-base) ease-(--ease-out-soft)",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-overlay hover:text-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2 : 1.5} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-1 border-t border-hairline pt-3">
        <UserMenu
          variant="rail"
          email={user.email}
          name={user.name}
          image={user.image}
        />
        <ThemeToggle />
      </div>
    </aside>
  );
}
