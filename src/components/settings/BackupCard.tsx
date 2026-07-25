"use client";

import { Download, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { exportData, importData, type BackupPayload } from "@/lib/actions/backup";

export function BackupCard() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

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
    if (!confirm("Importing replaces all current data. Continue?")) return;
    setBusy(true);
    try {
      const payload = JSON.parse(await file.text()) as BackupPayload;
      await importData(payload);
      toast.success("Data imported");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Surface className="p-4">
      <h2 className="text-sm font-semibold">Backup</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Export a JSON copy of all your data, or restore from one.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={busy} onClick={onExport}>
          <Download className="size-4" />
          Export
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-4" />
          Import
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onFile}
      />
    </Surface>
  );
}
