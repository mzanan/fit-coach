"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

import "./globals.css";

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorScreen onRetry={retry} />
      </body>
    </html>
  );
}
