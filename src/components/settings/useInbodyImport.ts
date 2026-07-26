"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { commitInbodyScan, extractInbodyScan } from "@/lib/actions/inbody";
import type { InbodyExtraction } from "@/lib/ai/inbody";
import {
  BODY_SEGMENTS,
  INBODY_NUMERIC_KEYS,
  INBODY_TEXT_KEYS,
  type Segmental,
} from "@/lib/constants";
import { compressImage } from "@/lib/imageCompress";

export interface ScanDraft {
  taken_at: string;
  notes: string;
  values: Record<string, string>;
  texts: Record<string, string>;
}

export type FieldStatus = Record<string, "absent" | "illegible">;

function toDraft(x: InbodyExtraction): ScanDraft {
  const record = x as unknown as Record<string, unknown>;
  return {
    taken_at: x.test_datetime?.slice(0, 16).replace(" ", "T") ?? "",
    notes: "",
    values: Object.fromEntries(
      INBODY_NUMERIC_KEYS.map((key) => {
        const value = record[key];
        return [key, value == null ? "" : String(value)];
      }),
    ),
    texts: Object.fromEntries(
      INBODY_TEXT_KEYS.map((key) => {
        const value = record[key];
        return [key, value == null ? "" : String(value)];
      }),
    ),
  };
}

export function useInbodyImport() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<ScanDraft | null>(null);
  const [segmental, setSegmental] = useState<Segmental | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<FieldStatus>({});

  function reset() {
    setDraft(null);
    setSegmental(null);
    setWarnings([]);
    setStatus({});
    setPreview(null);
  }

  async function onFile(file: File) {
    setBusy(true);
    try {
      const image = await compressImage(file);
      const form = new FormData();
      form.append("image", image, file.name || "inbody.jpg");
      const { extraction, image: shown } = await extractInbodyScan(form);
      setDraft(toDraft(extraction));
      setSegmental(extraction.segmental ?? null);
      setWarnings(extraction.warnings ?? []);
      setStatus({
        ...Object.fromEntries(
          (extraction.absent ?? []).map((k) => [k, "absent" as const]),
        ),
        ...Object.fromEntries(
          (extraction.illegible ?? []).map((k) => [k, "illegible" as const]),
        ),
      });
      setPreview(shown);
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
      await commitInbodyScan({
        taken_at: draft.taken_at,
        notes: str(draft.notes),
        segmental: hasSegmental() ? JSON.stringify(segmental) : null,
        ...Object.fromEntries(INBODY_NUMERIC_KEYS.map((key) => [key, n(key)])),
        ...Object.fromEntries(
          INBODY_TEXT_KEYS.map((key) => [key, str(draft.texts[key] ?? "")]),
        ),
      });
      toast.success("Body scan saved");
      reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the scan");
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    draft,
    segmental,
    warnings,
    preview,
    status,
    onFile,
    setValue,
    setText,
    setMeta,
    save,
    discard: reset,
  };
}
