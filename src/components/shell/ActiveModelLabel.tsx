import Link from "next/link";

import type { AiCredential } from "@/lib/ai/aiCredentials";
import { cn } from "@/lib/utils";

export function ActiveModelLabel({
  credential,
  className,
}: {
  credential: AiCredential | null;
  className?: string;
}) {
  if (!credential) return null;

  return (
    <Link
      href="/settings/ai"
      className={cn(
        "text-meta text-muted-foreground transition-colors duration-(--dur-fast) hover:text-foreground",
        className,
      )}
    >
      {credential.model} ({credential.provider})
    </Link>
  );
}
