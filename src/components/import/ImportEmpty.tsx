import { FileText } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function ImportEmpty({
  warnings,
  onBack,
}: {
  warnings: string[];
  onBack: () => void;
}) {
  return (
    <EmptyState
      icon={FileText}
      title="Nothing to import"
      body="No days, meals or workouts were found in that log."
      action={
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      }
    >
      {warnings.length ? (
        <ul className="mx-auto mt-card max-w-[52ch] space-y-1 text-left text-meta text-muted-foreground">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      ) : null}
    </EmptyState>
  );
}
