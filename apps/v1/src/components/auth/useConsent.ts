"use client";

import { useState } from "react";

import { authClient } from "@/lib/authClient";

export function useConsent() {
  const [pending, setPending] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(accept: boolean) {
    setError(null);
    setPending(accept ? "accept" : "deny");
    const { data, error: consentError } = await authClient.oauth2.consent({ accept });
    if (consentError) {
      setPending(null);
      setError(consentError.message ?? "Could not complete the authorization. Try again.");
      return;
    }
    const redirectUrl = (data as { url?: string; redirect_uri?: string } | null)?.url
      ?? (data as { redirect_uri?: string } | null)?.redirect_uri;
    if (redirectUrl) window.location.href = redirectUrl;
  }

  return { pending, error, respond };
}
