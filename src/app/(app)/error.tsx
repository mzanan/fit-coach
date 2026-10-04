"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Page } from "@/components/ui/Page";

export default function AppError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <Page>
      <EmptyState
        icon={AlertCircle}
        title="This screen could not load"
        body="Check your connection and try again."
        action={<Button onClick={unstable_retry}>Try again</Button>}
      />
    </Page>
  );
}
