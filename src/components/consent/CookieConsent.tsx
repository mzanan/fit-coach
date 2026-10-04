"use client";

import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { useAnalyticsConsent } from "@/hooks/useAnalyticsConsent";

export function CookieConsent() {
  const { status, accept, decline } = useAnalyticsConsent();

  if (status !== "pending") return null;

  return (
    <Surface
      role="region"
      aria-label="Cookie consent"
      level="raised"
      radius="xl"
      className="bottom-consent fixed inset-x-gutter z-40 flex animate-in flex-col gap-3 p-card duration-(--dur-slow) ease-(--ease-out-soft) fade-in slide-in-from-bottom-2 motion-reduce:animate-none md:right-gutter md:left-auto md:max-w-sm"
    >
      <p className="text-meta text-muted-foreground">
        We use first-party cookies for analytics and text-masked session replay,
        never ads. Decline and we only count visits anonymously.{" "}
        <Link
          href="/privacy"
          className="text-foreground underline underline-offset-4"
        >
          Privacy policy
        </Link>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="md" onClick={decline}>
          Decline
        </Button>
        <Button variant="outline" size="md" onClick={accept}>
          Accept
        </Button>
      </div>
    </Surface>
  );
}
