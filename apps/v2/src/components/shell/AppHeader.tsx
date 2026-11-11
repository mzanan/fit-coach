import { ActiveModelLabel } from "@/components/shell/ActiveModelLabel";
import { RailToggle } from "@/components/shell/RailToggle";
import { SectionCrumb } from "@/components/shell/SectionCrumb";
import { UserMenu } from "@/components/shell/UserMenu";
import { BrandMark } from "@/components/ui/BrandMark";
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
        "sticky top-0 z-30 flex h-14 items-center justify-between gap-2 bg-background/80 px-gutter backdrop-blur-xl md:h-nav md:border-b md:border-hairline",
        className,
      )}
    >
      <BrandMark href="/" size="sm" className="shrink-0 md:hidden" />
      <div className="hidden shrink-0 items-center gap-2 md:flex">
        <RailToggle className="-ml-3" />
        <SectionCrumb />
      </div>
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
