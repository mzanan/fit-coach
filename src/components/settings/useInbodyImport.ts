"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  commitInbodyScan,
  importInbodyScan,
  resolveInbodyDuplicate,
  type ExistingScan,
  type SavedScan,
  type ScanInput,
} from "@/lib/actions/inbody";
import {
  BODY_SEGMENTS,
  INBODY_NUMERIC_KEYS,
  INBODY_TEXT_KEYS,
  type Segmental,
} from "@/lib/constants";
import { compressImage } from "@/lib/imageCompress";
import { toDraft, type ScanDraft } from "@/lib/inbodyDraft";

export type { ScanDraft } from "@/lib/inbodyDraft";

export type FieldStatus = Record<string, "absent" | "illegible" | "suspect">;

export interface DuplicateScan {
  pending: ScanInput;
  existing: ExistingScan;
}

export function useInbodyImport() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<SavedScan | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateScan | null>(null);
  const [draft, setDraft] = useState<ScanDraft | null>(null);
  const [segmental, setSegmental] = useState<Segmental | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<FieldStatus>({});

  function reset() {
    setSaved(null);
    setDuplicate(null);
    setDraft(null);
    setSegmental(null);
    setWarnings([]);
    setReason(null);
    setStatus({});
    setPreview(null);
  }

  async function onFile(file: File) {
    setBusy(true);
    reset();
    try {
      const image = await compressImage(file);
      const form = new FormData();
      form.append("image", image, file.name || "inbody.jpg");
      const result = await importInbodyScan(form);

      if (result.status === "saved") {
        setSaved(result.saved);
        router.refresh();
        return;
      }

      if (result.status === "duplicate") {
        setDuplicate({ pending: result.pending, existing: result.existing });
        return;
      }

      setDraft(toDraft(result.extraction));
      setSegmental(result.extraction.segmental ?? null);
      setWarnings(result.extraction.warnings ?? []);
      setReason(result.reason);
      setPreview(result.image);
      setStatus({
        ...Object.fromEntries(
          (result.extraction.absent ?? []).map((k) => [k, "absent" as const]),
        ),
        ...Object.fromEntries(
          (result.extraction.illegible ?? []).map((k) => [
            k,
            "illegible" as const,
          ]),
        ),
        ...Object.fromEntries(
          result.verification.suspectFields.map((k) => [k, "suspect" as const]),
        ),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read the sheet");
    } finally {
      setBusy(false);
    }
  }

  function setValue(key: string, value: string) {
    setDraft((d) => (d ? { ...d, values: { ...d.values, [key]: value } } : d));
  }

  function setText(key: string, value: string) {
    setDraft((d) => (d ? { ...d, texts: { ...d.texts, [key]: value } } : d));
  }

  function setMeta(key: "taken_at" | "notes", value: string) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  function hasSegmental(): boolean {
    if (!segmental) return false;
    return BODY_SEGMENTS.some((s) =>
      Object.values(segmental[s.key] ?? {}).some((v) => v != null),
    );
  }

  async function save() {
    if (!draft) return;
    if (!draft.taken_at) {
      toast.error("Set the scan date");
      return;
    }
    setBusy(true);
    try {
      const n = (key: string) => {
        const raw = draft.values[key]?.trim();
        return raw ? Number(raw) : null;
      };
      const str = (value: string) => (value.trim() === "" ? null : value.trim());
      const result = await commitInbodyScan({
        taken_at: draft.taken_at,
        notes: str(draft.notes),
        segmental: hasSegmental() ? JSON.stringify(segmental) : null,
        ...Object.fromEntries(INBODY_NUMERIC_KEYS.map((key) => [key, n(key)])),
        ...Object.fromEntries(
          INBODY_TEXT_KEYS.map((key) => [key, str(draft.texts[key] ?? "")]),
        ),
      });

      if (result.status === "duplicate") {
        setDuplicate({ pending: result.pending, existing: result.existing });
        setDraft(null);
        return;
      }

      setSaved(result.saved);
      setDraft(null);
      setPreview(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the scan");
    } finally {
      setBusy(false);
    }
  }

  async function resolveDuplicate(mode: "replace" | "new") {
    if (!duplicate) return;
    setBusy(true);
    try {
      const result = await resolveInbodyDuplicate(
        duplicate.pending,
        mode,
        duplicate.existing.id,
      );
      setDuplicate(null);
      setSaved(result);
      toast.success(mode === "replace" ? "Scan replaced" : "Saved as a new scan");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the scan");
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    saved,
    duplicate,
    draft,
    segmental,
    warnings,
    reason,
    preview,
    status,
    onFile,
    setValue,
    setText,
    setMeta,
    save,
    resolveDuplicate,
    discard: reset,
  };
}
