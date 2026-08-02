import { AppHeader } from "@/components/shell/AppHeader";
import { NavBar } from "@/components/shell/NavBar";
import { SideNav } from "@/components/shell/SideNav";
import { requireUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-card focus:px-4 focus:py-2 focus:text-body focus:shadow-raised"
      >
        Skip to content
      </a>
      <div className="flex h-dvh w-full overflow-hidden">
        <SideNav user={user} />
        <div className="flex w-full min-w-0 flex-1 flex-col">
          <AppHeader className="md:hidden" />
          <main
            id="main"
            className="scroll-slim min-h-0 flex-1 overflow-y-auto pt-2 pb-28 md:pt-gutter md:pb-gutter"
          >
            {children}
          </main>
          <NavBar className="md:hidden" />
        </div>
      </div>
    </>
  );
}
