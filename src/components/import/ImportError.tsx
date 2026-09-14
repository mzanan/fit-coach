import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export function ImportError({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <Surface level="sunken" className="px-6 py-10 text-center">
      <p className="text-body">Extraction interrupted</p>
      <p className="mx-auto mt-1.5 max-w-[40ch] text-meta text-muted-foreground">
        {message}
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onRetry}>Reconnect</Button>
      </div>
    </Surface>
  );
}
