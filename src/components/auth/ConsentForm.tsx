"use client";

import { useConsent } from "@/components/auth/useConsent";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export function ConsentForm({
  clientName,
  redirectHost,
  scopes,
}: {
  clientName: string;
  redirectHost: string | null;
  scopes: string[];
}) {
  const { pending, error, respond } = useConsent();

  return (
    <Surface level="raised">
      <p className="text-body">
        <span className="font-semibold">{clientName}</span> wants to read and log your meals,
        workouts and body data in Fit Coach.
      </p>
      {redirectHost ? (
        <p className="mt-tight text-meta text-muted-foreground">Returns to {redirectHost}</p>
      ) : null}
      {scopes.length ? (
        <p className="mt-tight text-meta text-muted-foreground">Scopes: {scopes.join(", ")}</p>
      ) : null}
      <div className="mt-block flex gap-tight">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={pending !== null}
          onClick={() => respond(false)}
        >
          {pending === "deny" ? "Denying..." : "Deny"}
        </Button>
        <Button
          type="button"
          variant="solid"
          size="lg"
          className="flex-1"
          disabled={pending !== null}
          onClick={() => respond(true)}
        >
          {pending === "accept" ? "Allowing..." : "Allow"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-tight text-meta text-destructive">
          {error}
        </p>
      ) : null}
    </Surface>
  );
}
