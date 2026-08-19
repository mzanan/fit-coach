import { ActiveModelLabel } from "@/components/shell/ActiveModelLabel";
import { UserMenu } from "@/components/shell/UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { AiCredential } from "@/lib/ai/aiCredentials";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function AppHeader({
  className,
  activeModel,
}: {
  className?: string;
  activeModel: AiCredential | null;
}) {
  const user = await requireUser();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center justify-between gap-2 bg-background/80 px-gutter backdrop-blur-xl",
        className,
      )}
    >
      <span className="shrink-0 text-title font-medium tracking-(--tracking-snug)">
        Fit Coach
      </span>
      <ActiveModelLabel
        credential={activeModel}
        className="min-w-0 flex-1 truncate text-right"
      />
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <UserMenu email={user.email} name={user.name} image={user.image} />
      </div>
    </header>
  );
}
