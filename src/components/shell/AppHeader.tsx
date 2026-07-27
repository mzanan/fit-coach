import { UserMenu } from "@/components/shell/UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { requireUser } from "@/lib/session";

export async function AppHeader() {
  const user = await requireUser();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 bg-background/80 px-5 backdrop-blur-xl md:px-8">
      <span className="text-title font-medium tracking-[--tracking-snug] md:hidden">
        Fit Coach
      </span>
      <span className="hidden md:block" />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu email={user.email} name={user.name} image={user.image} />
      </div>
    </header>
  );
}
