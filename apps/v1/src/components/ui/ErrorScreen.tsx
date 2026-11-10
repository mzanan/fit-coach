import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5">
      <EmptyState
        title="Something went wrong"
        body="The page could not load. Check your connection and try again."
        action={<Button onClick={onRetry}>Try again</Button>}
      />
    </main>
  );
}
