import { AppHeader } from "@/components/shell/AppHeader";
import { NavBar } from "@/components/shell/NavBar";
import { SideNav } from "@/components/shell/SideNav";
import { requireUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl">
      <SideNav />
      <div className="flex w-full min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 px-5 pt-2 pb-28 md:px-8 md:pt-4 md:pb-10">
          <div className="mx-auto w-full max-w-2xl">{children}</div>
        </main>
        <NavBar className="md:hidden" />
      </div>
    </div>
  );
}
