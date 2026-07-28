"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/authClient";

export type LoginMode = "collapsed" | "email" | "code";

const RESEND_COOLDOWN_S = 30;

export function useLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("collapsed");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [googlePending, setGooglePending] = useState(false);
  const [pending, setPending] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startResendCooldown() {
    setResendIn(RESEND_COOLDOWN_S);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

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

  function toggleEmailPanel() {
    setMode((m) => (m === "collapsed" ? "email" : "collapsed"));
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setSendError(null);
    setPending(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
      });
      setPending(false);
      if (error) {
        setSendError(
          error.message ?? "Could not send the code. Check the address and try again.",
        );
        return;
      }
      setMode("code");
      startResendCooldown();
    } catch {
      setPending(false);
      setSendError("Could not send the code. Check your connection and try again.");
    }
  }

  async function resendCode() {
    if (resendIn > 0) return;
    setSendError(null);
    setPending(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
      });
      setPending(false);
      if (error) {
        setSendError(
          error.message ?? "Could not send the code. Check the address and try again.",
        );
        return;
      }
      startResendCooldown();
    } catch {
      setPending(false);
      setSendError("Could not send the code. Check your connection and try again.");
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError(null);
    setPending(true);
    try {
      const { error } = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp: code.trim(),
      });
      setPending(false);
      if (error) {
        setVerifyError(error.message ?? "That code is not valid. Check it or send a new one.");
        setCode("");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setPending(false);
      setVerifyError("Could not verify the code. Check your connection and try again.");
    }
  }

  function useDifferentEmail() {
    setMode("email");
    setCode("");
    setVerifyError(null);
    if (timerRef.current) clearInterval(timerRef.current);
    setResendIn(0);
  }

  return {
    mode,
    email,
    setEmail,
    code,
    setCode,
    googlePending,
    pending,
    googleError,
    sendError,
    verifyError,
    resendIn,
    signInWithGoogle,
    toggleEmailPanel,
    sendCode,
    resendCode,
    verify,
    useDifferentEmail,
  };
}
