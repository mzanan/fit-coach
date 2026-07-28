"use client";

import { Download, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { exportData, importData, type BackupPayload } from "@/lib/actions/backup";

export function BackupCard() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<BackupPayload | null>(null);

  async function onExport() {
    setBusy(true);
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fit-coach-backup-${data.exportedAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text()) as BackupPayload;
      setPendingPayload(payload);
    } catch {
      toast.error("That file is not a valid backup");
    }
  }

  async function confirmRestore() {
    if (!pendingPayload) return;
    setBusy(true);
    try {
      await importData(pendingPayload);
      toast.success("Data imported");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
      setPendingPayload(null);
    }
  }

  return (
    <>
      <Surface className="p-card">
        <p className="text-title font-medium tracking-(--tracking-snug)">Export</p>
        <p className="mt-1 text-meta text-muted-foreground">
          Downloads meals, workouts, scans and catalog as one file.
        </p>
        <Button
          variant="outline"
          className="mt-card w-full"
          disabled={busy}
          onClick={onExport}
        >
          <Download className="size-4" />
          {busy ? "Exporting..." : "Export JSON"}
        </Button>
      </Surface>

      <Surface className="mt-card p-card">
        <p className="text-title font-medium tracking-(--tracking-snug)">Restore</p>
        <p className="mt-1 text-meta text-muted-foreground">
          Replaces everything currently in this account.
        </p>
        <Button
          variant="outline"
          className="mt-card w-full text-destructive"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-4" />
          Choose backup file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFile}
        />
      </Surface>

      <ConfirmDialog
        open={pendingPayload !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPayload(null);
        }}
        title="Replace all data?"
        body="Restoring overwrites every meal, workout, scan and catalog item in this account. This cannot be undone."
        confirmLabel="Replace everything"
        tone="danger"
        pending={busy}
        onConfirm={confirmRestore}
      />
    </>
  );
}
