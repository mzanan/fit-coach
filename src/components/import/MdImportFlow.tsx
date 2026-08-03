"use client";

import { FileText, FileUp, Sparkles, X } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { StickyActions } from "@/components/ui/StickyActions";
import { Surface } from "@/components/ui/Surface";
import { Textarea } from "@/components/ui/Textarea";
import { ImportCatalogRow } from "@/components/import/ImportCatalogRow";
import { ImportMealRow } from "@/components/import/ImportMealRow";
import { ImportWorkoutRow } from "@/components/import/ImportWorkoutRow";
import { useMdImport } from "@/components/import/useMdImport";
import { formatDayLabel } from "@/lib/dates";

export function MdImportFlow({ today }: { today: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    pending,
    mdText,
    setMdText,
    attachFiles,
    attachments,
    progress,
    cancelExtraction,
    removeAttachment,
    extract,
    days,
    catalogItems,
    warnings,
    included,
    updateMeal,
    toggleMeal,
    toggleWorkout,
    toggleCatalogItem,
    reset,
    commit,
  } = useMdImport();

  if (pending && !days) {
    return (
      <Surface level="raised" className="p-card">
        <p className="eyebrow">Reading the log</p>
        <Skeleton className="mt-3 h-5 w-48" />
        <Skeleton className="mt-2 h-5 w-36" />
        <Skeleton className="mt-2 h-5 w-44" />
        <p className="mt-3 text-meta text-muted-foreground">
          {progress ?? "Starting"}
        </p>
        <p className="mt-1 text-meta text-muted-foreground">
          Each part is one call to your model, and a free tier can rate limit
          them, so a long log takes minutes. Leaving this page cancels the run,
          and nothing is saved until you confirm the review.
        </p>
        <Button
          variant="outline"
          className="mt-card"
          onClick={cancelExtraction}
        >
          Cancel
        </Button>
      </Surface>
    );
  }

  if (!days) {
    return (
      <div className="space-y-card">
        <Surface className="p-card">
          <Label htmlFor="md-text">Markdown log</Label>
          <Textarea
            id="md-text"
            value={mdText}
            onChange={(e) => setMdText(e.target.value)}
            placeholder="Paste a log here, or attach .md files below. Each file is read on its own."
            rows={12}
          />
          <div className="mt-card grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="size-4" />
              Attach .md files
            </Button>
            <Button
              disabled={pending || (!mdText.trim() && !attachments.length)}
              onClick={extract}
            >
              <Sparkles className="size-4" />
              Extract
            </Button>
          </div>
          {attachments.length ? (
            <ul className="mt-card space-y-1.5">
              {attachments.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2 rounded-control bg-well px-3 py-2"
                >
                  <FileText
                    className="size-4 shrink-0 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="min-w-0 flex-1 truncate text-meta">
                    {file.name}
                  </span>
                  <span className="shrink-0 text-meta text-muted-foreground">
                    {file.text.length.toLocaleString()} chars
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${file.name}`}
                    disabled={pending}
                    onClick={() => removeAttachment(file.id)}
                  >
                    <X className="size-4" strokeWidth={1.5} />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".md,text/markdown,text/plain"
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length) await attachFiles(files);
            }}
          />
        </Surface>
        <p className="text-meta text-muted-foreground">
          The AI proposes days, meals, workouts and catalog items. You review
          before anything is written.
        </p>
      </div>
    );
  }

  if (days.length === 0 && catalogItems.length === 0) {
    return (
      <Surface level="sunken" className="px-6 py-10 text-center">
        <p className="text-body">Nothing to import</p>
        <p className="mx-auto mt-1.5 max-w-[32ch] text-meta text-muted-foreground">
          No days, meals or workouts were found in that log.
        </p>
        <Button variant="outline" className="mt-5" onClick={reset}>
          Back
        </Button>
      </Surface>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-slim min-h-0 flex-1 space-y-block overflow-y-auto pr-1">
        {warnings.length ? (
          <Surface className="border-brand-line p-card">
            <p className="eyebrow">Check these</p>
            <ul className="mt-2 space-y-1 text-meta text-muted-foreground">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Surface>
        ) : null}

        {days.map((d) => (
          <Surface key={d.day} className="p-card">
            <p className="text-title font-medium tracking-(--tracking-snug)">
              {formatDayLabel(d.day, today)}
            </p>
            <p className="mt-0.5 text-meta text-muted-foreground">{d.day}</p>
            <div className="mt-card divide-y divide-border">
              {d.meals.map((m) => (
                <ImportMealRow
                  key={m.key}
                  meal={m}
                  onToggle={(include) => toggleMeal(d.day, m.key, include)}
                  onUpdate={(values) => updateMeal(d.day, m.key, values)}
                />
              ))}
              {d.workout ? (
                <ImportWorkoutRow
                  workout={d.workout}
                  onToggle={(include) => toggleWorkout(d.day, include)}
                />
              ) : null}
            </div>
          </Surface>
        ))}

        {catalogItems.length ? (
          <Surface className="p-card">
            <p className="text-title font-medium tracking-(--tracking-snug)">
              Catalog items
            </p>
            <p className="mt-0.5 text-meta text-muted-foreground">
              Items with a name you already have are skipped.
            </p>
            <div className="mt-card divide-y divide-border">
              {catalogItems.map((c) => (
                <ImportCatalogRow
                  key={c.key}
                  item={c}
                  onToggle={(include) => toggleCatalogItem(c.key, include)}
                />
              ))}
            </div>
          </Surface>
        ) : null}
      </div>

      <StickyActions className="grid shrink-0 grid-cols-2 gap-2">
        <Button variant="outline" disabled={pending} onClick={reset}>
          Back
        </Button>
        <Button
          disabled={
            pending ||
            !included ||
            (!included.meals && !included.workouts && !included.catalogItems)
          }
          onClick={commit}
        >
          {pending
            ? "Importing..."
            : `Import ${included?.meals ?? 0} meals, ${included?.workouts ?? 0} workouts`}
        </Button>
      </StickyActions>
    </div>
  );
}
