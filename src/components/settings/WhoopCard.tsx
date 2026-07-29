"use client";

import { Activity, RefreshCw, Unplug } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pill } from "@/components/ui/Pill";
import { Surface } from "@/components/ui/Surface";
import { useAction } from "@/hooks/useAction";
import { disconnectWhoopNow, syncWhoopNow } from "@/lib/actions/whoop";

interface WhoopCardProps {
  configured: boolean;
  connected: boolean;
  lastSyncedAt: string | null;
}

export function WhoopCard({ configured, connected, lastSyncedAt }: WhoopCardProps) {
  const { pending, run } = useAction();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const status = connected ? "Connected" : "Not connected";
  const description = connected
    ? lastSyncedAt
      ? `Last sync ${lastSyncedAt}`
      : "Not synced yet."
    : configured
      ? "Connect to pull the last 30 days, then keep it current."
      : "Set WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET to enable this.";

  return (
    <>
      <Surface level="raised" className="relative p-card">
        {connected ? (
          <Pill tone="brand" className="absolute top-4 right-4">
            Live
          </Pill>
        ) : null}
        <p className="eyebrow">Status</p>
        <p className="mt-2 text-metric font-medium">
          {configured ? status : "Unavailable"}
        </p>
        <p className="mt-1.5 text-meta text-muted-foreground">{description}</p>
      </Surface>

      {connected ? (
        <div className="mt-card grid grid-cols-2 gap-2">
          <Button
            variant="solid"
            disabled={pending}
            onClick={() => run(() => syncWhoopNow(), { success: "Whoop data synced" })}
          >
            <RefreshCw className="size-4" />
            {pending ? "Syncing..." : "Sync now"}
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => setConfirmOpen(true)}>
            <Unplug className="size-4" />
            Disconnect
          </Button>
        </div>
      ) : (
        <Button
          variant="solid"
          className="mt-card w-full"
          disabled={!configured}
          asChild={configured}
        >
          {configured ? (
            <a href="/api/whoop/connect">
              <Activity className="size-4" />
              Connect Whoop
            </a>
          ) : (
            <>
              <Activity className="size-4" />
              Connect Whoop
            </>
          )}
        </Button>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Disconnect Whoop?"
        body="Data already synced stays. New data stops arriving until you reconnect."
        confirmLabel="Disconnect"
        tone="destructive"
        pending={pending}
        onConfirm={() =>
          run(() => disconnectWhoopNow(), { success: "Whoop disconnected" })
        }
      />
    </>
  );
}
