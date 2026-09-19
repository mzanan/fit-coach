import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Surface } from "@/components/ui/Surface";
import { ImportFileList } from "@/components/import/ImportFileList";
import type { ImportFileStatus } from "@/lib/importStream";

export function ImportProgress({
  progress,
  files,
  onCancel,
}: {
  progress: string | null;
  files: ImportFileStatus[];
  onCancel: () => void;
}) {
  return (
    <div className="space-y-card">
      <Surface level="raised" className="p-card">
        <div className="flex items-center gap-2">
          <Spinner />
          <p className="eyebrow">Reading the log</p>
        </div>
        <p className="mt-1 text-meta text-muted-foreground">
          {progress ?? "Starting"}
        </p>
        <p className="mt-1 text-meta text-muted-foreground">
          Each part is one call to your model, and a free tier can rate limit
          them, so a long log takes minutes. The run keeps going on the server
          if you leave, and this page picks it up again when you come back.
          Nothing is saved until you confirm the review.
        </p>
        <Button variant="outline" className="mt-card" onClick={onCancel}>
          Cancel
        </Button>
      </Surface>
      <ImportFileList files={files} />
    </div>
  );
}
