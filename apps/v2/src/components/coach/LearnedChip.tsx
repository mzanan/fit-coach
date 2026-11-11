import { Check } from "lucide-react";

export function LearnedChip({ facts }: { facts: string[] }) {
  if (!facts.length) return null;

  return (
    <div className="flex items-start gap-1.5 text-meta text-muted-foreground">
      <Check className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} />
      <ul className="space-y-0.5">
        {facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    </div>
  );
}
