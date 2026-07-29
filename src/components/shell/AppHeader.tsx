import { UserMenu } from "@/components/shell/UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function AppHeader({ className }: { className?: string }) {
  const user = await requireUser();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center justify-between gap-2 bg-background/80 px-gutter backdrop-blur-xl",
        className,
      )}
    >
      <span className="text-title font-medium tracking-(--tracking-snug)">
        Fit Coach
      </span>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu email={user.email} name={user.name} image={user.image} />
      </div>
    </header>
  );
}
