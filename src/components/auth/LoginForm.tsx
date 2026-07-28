"use client";

import { ChevronDown } from "lucide-react";

import { EmailCodeForm } from "@/components/auth/EmailCodeForm";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { useLogin } from "@/components/auth/useLogin";
import { Button } from "@/components/ui/Button";
import { Collapse } from "@/components/ui/Collapse";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const login = useLogin();
  const { mode, googlePending, googleError, toggleEmailPanel } = login;
  const panelOpen = mode !== "collapsed";

  return (
    <Surface level="raised" radius="xl" className="p-card md:p-block">
      {googleEnabled ? (
        <>
          <Button
            type="button"
            variant="solid"
            size="lg"
            className="w-full"
            disabled={googlePending}
            onClick={login.signInWithGoogle}
          >
            <GoogleIcon />
            {googlePending ? "Opening Google..." : "Continue with Google"}
          </Button>
          {googleError ? (
            <p role="alert" className="mt-tight text-meta text-destructive">
              {googleError}
            </p>
          ) : null}

          {mode !== "code" ? (
            <Button
              type="button"
              variant="quiet"
              size="md"
              className="mt-tight w-full text-meta"
              aria-expanded={panelOpen}
              aria-controls="email-code-panel"
              onClick={toggleEmailPanel}
            >
              Use an email code instead
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-4 transition-transform duration-(--dur-base) ease-(--ease-out-soft)",
                  panelOpen && "rotate-180",
                )}
                strokeWidth={1.5}
              />
            </Button>
          ) : null}

          <Collapse open={panelOpen} id="email-code-panel">
            <EmailCodeForm login={login} />
          </Collapse>
        </>
      ) : (
        <>
          <p className="text-meta text-muted-foreground">
            Google sign-in is not set up on this deployment.
          </p>
          <div className="mt-tight">
            <EmailCodeForm login={login} />
          </div>
        </>
      )}
    </Surface>
  );
}
