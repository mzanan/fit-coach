"use client";

import { Activity, RefreshCw, Unplug } from "lucide-react";

import { Button } from "@/components/ui/Button";
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

  return (
    <Surface className="p-4">
      <h2 className="text-sm font-semibold">Whoop</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {connected
          ? lastSyncedAt
            ? `Connected. Last sync ${lastSyncedAt}.`
            : "Connected. Not synced yet."
          : configured
            ? "Sync recovery, sleep, strain and workouts from your Whoop band."
            : "Set WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET to enable."}
      </p>
      {connected ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(() => syncWhoopNow(), { success: "Whoop data synced" })
            }
          >
            <RefreshCw className="size-4" />
            {pending ? "Syncing..." : "Sync now"}
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (!confirm("Disconnect Whoop? Synced data is kept.")) return;
              run(() => disconnectWhoopNow(), { success: "Whoop disconnected" });
            }}
          >
            <Unplug className="size-4" />
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="mt-3">
          <Button variant="outline" disabled={!configured} asChild={configured}>
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
        </div>
      )}
    </Surface>
  );
}
