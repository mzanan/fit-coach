import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export function ImportEmpty({
  warnings,
  onBack,
}: {
  warnings: string[];
  onBack: () => void;
}) {
  return (
    <Surface level="sunken" className="px-6 py-10 text-center">
      <p className="text-body">Nothing to import</p>
      <p className="mx-auto mt-1.5 max-w-[32ch] text-meta text-muted-foreground">
        No days, meals or workouts were found in that log.
      </p>
      {warnings.length ? (
        <ul className="mx-auto mt-card max-w-[52ch] space-y-1 text-left text-meta text-muted-foreground">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      ) : null}
      <Button variant="outline" className="mt-5" onClick={onBack}>
        Back
      </Button>
    </Surface>
  );
}
