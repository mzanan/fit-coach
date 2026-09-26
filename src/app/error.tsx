"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function ErrorPage({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <ErrorScreen onRetry={unstable_retry} />;
}
