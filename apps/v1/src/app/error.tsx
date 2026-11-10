"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorScreen onRetry={retry} />;
}
