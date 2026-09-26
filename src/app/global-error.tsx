"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

import "./globals.css";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorScreen onRetry={unstable_retry} />
      </body>
    </html>
  );
}
