import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";

export function ImportProgress({
  progress,
  onCancel,
}: {
  progress: string | null;
  onCancel: () => void;
}) {
  return (
    <Surface level="raised" className="p-card">
      <p className="eyebrow">Reading the log</p>
      <Skeleton className="mt-3 h-5 w-48" />
      <Skeleton className="mt-2 h-5 w-36" />
      <Skeleton className="mt-2 h-5 w-44" />
      <p className="mt-3 text-meta text-muted-foreground">
        {progress ?? "Starting"}
      </p>
      <p className="mt-1 text-meta text-muted-foreground">
        Each part is one call to your model, and a free tier can rate limit
        them, so a long log takes minutes. Leaving this page cancels the run,
        and nothing is saved until you confirm the review.
      </p>
      <Button variant="outline" className="mt-card" onClick={onCancel}>
        Cancel
      </Button>
    </Surface>
  );
}
