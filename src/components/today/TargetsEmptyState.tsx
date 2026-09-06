import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export function TargetsEmptyState() {
  return (
    <Surface level="raised" className="p-5 text-center">
      <p className="eyebrow">Targets</p>
      <p className="mt-2 text-title font-medium tracking-(--tracking-snug)">
        No targets yet
      </p>
      <p className="mx-auto mt-1.5 max-w-[32ch] text-meta text-muted-foreground">
        Set your daily macros with the coach or enter them by hand.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href="/coach">Ask the coach</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/settings/targets">Enter targets</Link>
        </Button>
      </div>
    </Surface>
  );
}
