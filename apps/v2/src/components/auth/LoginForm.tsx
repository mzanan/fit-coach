"use client";

import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { useLogin } from "@/components/auth/useLogin";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const { googlePending, googleError, signInWithGoogle } = useLogin();

  return (
    <Surface level="raised">
      {googleEnabled ? (
        <>
          <Button
            type="button"
            variant="solid"
            size="lg"
            className="w-full"
            disabled={googlePending}
            onClick={signInWithGoogle}
          >
            <GoogleIcon />
            {googlePending ? "Opening Google..." : "Continue with Google"}
          </Button>
          {googleError ? (
            <p role="alert" className="mt-tight text-meta text-destructive">
              {googleError}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-meta text-muted-foreground">
          Google sign-in is not set up on this deployment.
        </p>
      )}
    </Surface>
  );
}
