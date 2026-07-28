"use client";

import { format, parseISO } from "date-fns";
import { CheckCircle2, ChevronDown, ScanLine } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { DuplicateScanDialog } from "@/components/settings/DuplicateScanDialog";
import { SegmentalTable } from "@/components/settings/SegmentalTable";
import { useInbodyImport } from "@/components/settings/useInbodyImport";
import { Button } from "@/components/ui/Button";
import { Collapse } from "@/components/ui/Collapse";
import { Input, Label } from "@/components/ui/Input";
import { NumberField } from "@/components/ui/NumberField";
import { Skeleton } from "@/components/ui/Skeleton";
import { Stat } from "@/components/ui/Stat";
import { StickyActions } from "@/components/ui/StickyActions";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";
import { INBODY_FIELD_GROUPS, INBODY_TEXT_FIELDS } from "@/lib/constants";

export function InbodyCard({ aiReady }: { aiReady: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [segmentalOpen, setSegmentalOpen] = useState(false);
  const {
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
    discard,
  } = useInbodyImport();

  const [prevDraft, setPrevDraft] = useState(draft);
  if (draft !== prevDraft) {
    setPrevDraft(draft);
    setSegmentalOpen(false);
  }

  const hint = (key: string) =>
    status[key] === "absent"
      ? "not in sheet"
      : status[key] === "illegible"
        ? "unreadable"
        : status[key] === "suspect"
          ? "check this"
          : undefined;

  function pick() {
    fileRef.current?.click();
  }

  const reading = busy && draft === null && !saved && !duplicate;

  return (
    <>
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

      <DuplicateScanDialog
        duplicate={duplicate}
        busy={busy}
        onResolve={(mode) => void resolveDuplicate(mode)}
        onCancel={discard}
      />

      {saved ? (
        <Surface level="raised" className="p-card">
          <p className="flex items-center gap-2 text-body">
            <CheckCircle2 className="size-4 text-brand" />
            Scan saved
          </p>
          <p className="mt-1.5 text-meta text-muted-foreground">
            {format(parseISO(saved.taken_at), "d MMM yyyy HH:mm")}
            {" · "}
            <span className="num">{saved.fieldCount}</span> values
            {" · "}
            <span className="num">{saved.checksPassed}</span> checks passed
          </p>
          <div className="mt-card grid grid-cols-3 gap-4">
            <Stat size="sm" label="Weight" value={saved.weight_kg} unit="kg" />
            <Stat
              size="sm"
              label="Skeletal muscle"
              value={saved.skeletal_muscle_kg}
              unit="kg"
            />
            <Stat size="sm" label="Body fat" value={saved.body_fat_pct} unit="%" />
          </div>
          <div className="mt-card grid grid-cols-2 gap-2">
            <Button asChild>
              <Link href="/body">See body dashboard</Link>
            </Button>
            <Button variant="outline" disabled={busy} onClick={pick}>
              Import another
            </Button>
          </div>
        </Surface>
      ) : reading ? (
        <Surface level="raised" className="p-card">
          <p className="eyebrow">Reading the sheet</p>
          <Skeleton className="mt-3 h-5 w-40" />
          <Skeleton className="mt-2 h-5 w-32" />
          <Skeleton className="mt-2 h-5 w-36" />
          <p className="mt-3 text-meta text-muted-foreground">
            This takes a few seconds.
          </p>
        </Surface>
      ) : draft !== null ? (
        <div className="space-y-block pb-4">
          {reason ? (
            <p className="text-meta text-muted-foreground">{reason}</p>
          ) : null}

          {preview ? (
            <>
              <p className="eyebrow">Imported sheet</p>
              <a
                href={preview}
                target="_blank"
                rel="noreferrer"
                aria-label="Open the imported sheet full size"
                className="relative mt-2 block h-56 w-full md:h-64"
              >
                <Image
                  src={preview}
                  alt="Imported InBody sheet"
                  fill
                  unoptimized
                  className="rounded-lg border border-border object-contain"
                />
              </a>
            </>
          ) : null}

          {warnings.length > 0 ? (
            <Surface className="border-brand-line p-card">
              <p className="eyebrow">Check these</p>
              <ul className="mt-2 space-y-1 text-meta text-muted-foreground">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Surface>
          ) : null}

          <Surface className="p-card">
            <Label htmlFor="inbody-taken-at">Scan date</Label>
            <Input
              id="inbody-taken-at"
              type="datetime-local"
              value={draft.taken_at}
              onChange={(e) => setMeta("taken_at", e.target.value)}
            />
            <div className="mt-card grid gap-2 sm:grid-cols-2">
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
          </Surface>

          {INBODY_FIELD_GROUPS.map((group) => (
            <Surface key={group.title} className="p-card">
              <p className="eyebrow">{group.title}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
            </Surface>
          ))}

          {segmental ? (
            <Surface className="p-card">
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between"
                aria-expanded={segmentalOpen}
                aria-controls="segmental-panel"
                onClick={() => setSegmentalOpen((v) => !v)}
              >
                <span className="eyebrow">Segmental analysis</span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "size-4 text-faint transition-transform duration-(--dur-base) ease-(--ease-out-soft)",
                    segmentalOpen && "rotate-180",
                  )}
                />
              </button>
              <Collapse open={segmentalOpen} id="segmental-panel">
                <div className="pt-2">
                  <SegmentalTable data={segmental} />
                </div>
              </Collapse>
            </Surface>
          ) : null}

          <Surface className="p-card">
            <Label htmlFor="inbody-notes">Notes</Label>
            <Input
              id="inbody-notes"
              value={draft.notes}
              placeholder="Optional"
              onChange={(e) => setMeta("notes", e.target.value)}
            />
          </Surface>

          <StickyActions className="grid grid-cols-2 gap-2">
            <Button disabled={busy} onClick={() => void save()}>
              {busy ? "Saving..." : "Save scan"}
            </Button>
            <Button variant="outline" disabled={busy} onClick={discard}>
              Discard
            </Button>
          </StickyActions>
        </div>
      ) : (
        <Surface level="sunken" className="px-6 py-10 text-center">
          <ScanLine
            className="mx-auto size-6 text-muted-foreground"
            strokeWidth={1.5}
          />
          <p className="mt-3 text-body">
            {aiReady ? "No scan in progress" : "Sheet reading is off"}
          </p>
          <p className="mx-auto mt-1.5 max-w-[32ch] text-meta text-muted-foreground">
            {aiReady
              ? "Take a photo of the result sheet, or pick the screenshot from your app or email."
              : "Set AI_VISION_API_KEY to enable automatic reading."}
          </p>
          <Button className="mt-5" disabled={!aiReady} onClick={pick}>
            <ScanLine className="size-4" />
            Choose photo
          </Button>
        </Surface>
      )}
    </>
  );
}
