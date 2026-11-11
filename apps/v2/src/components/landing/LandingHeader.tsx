import Link from "next/link";

import { BrandMark } from "@/components/ui/BrandMark";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function LandingHeader() {
  return (
    <header className="hairline-b sticky top-0 z-10 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-nav max-w-(--container-wide) items-center gap-2 px-gutter">
        <BrandMark href="/" />
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
