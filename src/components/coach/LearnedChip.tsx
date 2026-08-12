import { Check, Loader2 } from "lucide-react";

import type { LearnedState } from "@/lib/data/coachMessages";

export function LearnedChip({ learned }: { learned: LearnedState }) {
  if (learned.state === "pending") {
    return (
      <p className="flex items-center gap-1.5 text-meta text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} />
        Remembering
      </p>
    );
  }

  if (!learned.facts.length) return null;

  return (
    <div className="flex items-start gap-1.5 text-meta text-muted-foreground">
      <Check className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} />
      <ul className="space-y-0.5">
        {learned.facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    </div>
  );
}
