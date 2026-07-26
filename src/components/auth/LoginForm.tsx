"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/authClient";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  async function signInWithGoogle() {
    setGooglePending(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
    if (error) {
      setGooglePending(false);
      toast.error(error.message ?? "Could not sign in with Google");
    }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim(),
      type: "sign-in",
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Could not send the code");
      return;
    }
    toast.success("Code sent. Check your email.");
    setStep("otp");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const { error } = await authClient.signIn.emailOtp({
      email: email.trim(),
      otp: otp.trim(),
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? "Invalid code");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold">Fit Coach</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to continue.</p>

      <Button
        type="button"
        size="lg"
        className="mt-6 w-full"
        disabled={googlePending}
        onClick={signInWithGoogle}
      >
        {googlePending ? "Redirecting..." : "Continue with Google"}
      </Button>

      <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or use a one-time email code
        <span className="h-px flex-1 bg-border" />
      </div>

      {step === "email" ? (
        <form onSubmit={sendCode} className="mt-6 space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={pending}
          >
            {pending ? "Sending..." : "Send code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-3">
          <div>
            <Label htmlFor="otp">6-digit code</Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={pending}
          >
            {pending ? "Verifying..." : "Verify and sign in"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm text-muted-foreground"
            onClick={() => setStep("email")}
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
