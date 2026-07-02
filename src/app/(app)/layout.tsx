import { NavBar } from "@/components/shell/NavBar";
import { SideNav } from "@/components/shell/SideNav";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  await ensureProfile(user.id);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl">
      <SideNav />
      <div className="flex w-full min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 py-5 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-2xl">{children}</div>
        </main>
        <NavBar className="md:hidden" />
      </div>
    </div>
  );
}
