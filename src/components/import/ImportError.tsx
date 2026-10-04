import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

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
    <EmptyState
      icon={AlertCircle}
      title="Extraction interrupted"
      body={message}
      action={
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onRetry}>Reconnect</Button>
        </div>
      }
    />
  );
}
