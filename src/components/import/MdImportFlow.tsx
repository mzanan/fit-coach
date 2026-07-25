"use client";

import { FileUp, Sparkles } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { Surface } from "@/components/ui/Surface";
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
    loadFile,
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

  if (!days) {
    return (
      <div className="space-y-4">
        <Surface className="p-4">
          <Label htmlFor="md-text">Markdown log</Label>
          <textarea
            id="md-text"
            value={mdText}
            onChange={(e) => setMdText(e.target.value)}
            placeholder="Paste your markdown tracking log here, or load the .md file."
            rows={12}
            className="mt-1 w-full rounded-lg border border-border bg-transparent p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="size-4" />
              Load .md
            </Button>
            <Button disabled={pending || !mdText.trim()} onClick={extract}>
              <Sparkles className="size-4" />
              {pending ? "Extracting..." : "Extract"}
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".md,text/markdown,text/plain"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) await loadFile(file);
            }}
          />
        </Surface>
        <p className="text-xs text-muted-foreground">
          The AI reads the log and proposes days, meals, workouts and catalog
          items. Nothing is saved until you review and confirm.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {warnings.length ? (
        <Surface className="border border-warn/40 p-4">
          <h2 className="text-sm font-semibold">Warnings</h2>
          <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Surface>
      ) : null}

      {days.map((d) => (
        <Surface key={d.day} className="p-4">
          <h2 className="text-sm font-semibold">
            {formatDayLabel(d.day, today)}{" "}
            <span className="font-normal text-muted-foreground">{d.day}</span>
          </h2>
          <div className="mt-1 divide-y divide-border">
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
        <Surface className="p-4">
          <h2 className="text-sm font-semibold">Catalog items</h2>
          <p className="text-xs text-muted-foreground">
            Existing items with the same name are skipped on import.
          </p>
          <div className="mt-1 divide-y divide-border">
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

      <div className="grid grid-cols-2 gap-2">
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
      </div>
    </div>
  );
}
