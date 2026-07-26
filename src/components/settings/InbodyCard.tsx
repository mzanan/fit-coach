"use client";

import { ScanLine } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

import { SegmentalTable } from "@/components/settings/SegmentalTable";
import { useInbodyImport } from "@/components/settings/useInbodyImport";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { NumberField } from "@/components/ui/NumberField";
import { Surface } from "@/components/ui/Surface";
import { INBODY_FIELD_GROUPS, INBODY_TEXT_FIELDS } from "@/lib/constants";

export function InbodyCard({ aiReady }: { aiReady: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const {
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
    discard,
  } = useInbodyImport();

  const hint = (key: string) =>
    status[key] === "absent"
      ? "not in sheet"
      : status[key] === "illegible"
        ? "unreadable"
        : undefined;

  return (
    <Surface className="p-4">
      <h2 className="text-sm font-semibold">InBody scan</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {aiReady
          ? "Import the result image (app screenshot, email or a photo of the sheet); check it against the values before saving."
          : "Set AI_API_KEY to enable sheet reading."}
      </p>

      {draft === null ? (
        <div className="mt-3">
          <Button
            variant="outline"
            disabled={!aiReady || busy}
            onClick={() => fileRef.current?.click()}
          >
            <ScanLine className="size-4" />
            {busy ? "Reading sheet..." : "Import scan photo"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onFile(file);
            }}
          />
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {preview && (
            <a
              href={preview}
              target="_blank"
              rel="noreferrer"
              className="relative block h-64 w-full"
            >
              <Image
                src={preview}
                alt="Imported InBody sheet"
                fill
                unoptimized
                className="rounded-lg border border-border object-contain"
              />
            </a>
          )}

          {warnings.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {warnings.map((w) => (
                <li key={w}>! {w}</li>
              ))}
            </ul>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <Label htmlFor="inbody-taken-at">Scan date</Label>
              <Input
                id="inbody-taken-at"
                type="datetime-local"
                value={draft.taken_at}
                onChange={(e) => setMeta("taken_at", e.target.value)}
              />
            </div>
            {INBODY_TEXT_FIELDS.map((f) => (
              <div key={f.key}>
                <Label htmlFor={`inbody-${f.key}`}>{f.label}</Label>
                <Input
                  id={`inbody-${f.key}`}
                  value={draft.texts[f.key] ?? ""}
                  placeholder={hint(f.key) ?? f.placeholder}
                  onChange={(e) => setText(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>

          {INBODY_FIELD_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-muted-foreground">
                {group.title}
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.fields.map((f) => (
                  <NumberField
                    key={f.key}
                    id={`inbody-${f.key}`}
                    label={f.label}
                    step={f.step}
                    value={draft.values[f.key] ?? ""}
                    placeholder={hint(f.key)}
                    onChange={(v) => setValue(f.key, v)}
                  />
                ))}
              </div>
            </div>
          ))}

          {segmental && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground">
                Segmental analysis
              </h3>
              <div className="mt-2">
                <SegmentalTable data={segmental} />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="inbody-notes">Notes</Label>
            <Input
              id="inbody-notes"
              value={draft.notes}
              placeholder="Optional"
              onChange={(e) => setMeta("notes", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button disabled={busy} onClick={() => void save()}>
              {busy ? "Saving..." : "Save scan"}
            </Button>
            <Button variant="outline" disabled={busy} onClick={discard}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </Surface>
  );
}
