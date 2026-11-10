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
      <Surface level="raised">
        <div className="flex items-center gap-2">
          <Spinner />
          <p className="eyebrow">Reading the log</p>
        </div>
        <p className="mt-1 text-meta text-muted-foreground">
          {progress ?? "Starting"}
        </p>
        <p className="mt-1 text-meta text-muted-foreground">
          Each part is one call to your model, so a long log can take minutes on a free tier. You can leave; the run continues and resumes here. Nothing is saved until you confirm.
        </p>
        <Button variant="outline" className="mt-card" onClick={onCancel}>
          Cancel
        </Button>
      </Surface>
      <ImportFileList files={files} />
    </div>
  );
}
