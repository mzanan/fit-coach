import { cookies } from "next/headers";

import { AnalyticsIdentify } from "@/components/analytics/AnalyticsIdentify";
import { AppHeader } from "@/components/shell/AppHeader";
import { NavBar } from "@/components/shell/NavBar";
import { RailShell } from "@/components/shell/RailShell";
import { SideNav } from "@/components/shell/SideNav";
import { getAiSettings } from "@/lib/ai/aiCredentials";
import { RAIL_COOKIE, isRailCollapsed } from "@/lib/railCookie";
import { requireUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const activeModel = await getAiSettings(user.id);
  const railCollapsed = isRailCollapsed(
    (await cookies()).get(RAIL_COOKIE)?.value,
  );

  return (
    <>
      <AnalyticsIdentify userId={user.id} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-card focus:px-4 focus:py-2 focus:text-body focus:shadow-raised"
      >
        Skip to content
      </a>
      <RailShell initialCollapsed={railCollapsed}>
        <SideNav />
        <div className="flex w-full min-w-0 flex-1 flex-col">
          <AppHeader activeModel={activeModel} />
          <main
            id="main"
            className="scroll-slim min-h-0 flex-1 overflow-y-auto pt-2 pb-6 md:pt-gutter md:pb-gutter"
          >
            {children}
          </main>
          <NavBar className="md:hidden" />
        </div>
      </RailShell>
    </>
  );
}
