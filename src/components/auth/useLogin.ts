"use client";

import { useState } from "react";

import { authClient } from "@/lib/authClient";

export function useLogin() {
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setGoogleError(null);
    setGooglePending(true);
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
      if (error) {
        setGooglePending(false);
        setGoogleError(error.message ?? "Google sign-in failed. Try again.");
      }
    } catch {
      setGooglePending(false);
      setGoogleError("Google sign-in failed. Check your connection and try again.");
    }
  }

  return { googlePending, googleError, signInWithGoogle };
}
