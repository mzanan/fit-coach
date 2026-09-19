import { Button } from "@/components/ui/Button";
import { StickyActions } from "@/components/ui/StickyActions";
import { Surface } from "@/components/ui/Surface";
import { ImportBodyScanRow } from "@/components/import/ImportBodyScanRow";
import { ImportCatalogRow } from "@/components/import/ImportCatalogRow";
import { ImportFactRow } from "@/components/import/ImportFactRow";
import { ImportMealRow } from "@/components/import/ImportMealRow";
import { ImportRuleRow } from "@/components/import/ImportRuleRow";
import { ImportWorkoutRow } from "@/components/import/ImportWorkoutRow";
import type {
  PreviewBodyScan,
  PreviewCatalogItem,
  PreviewDay,
  PreviewFact,
  PreviewRule,
} from "@/components/import/useMdImport";
import type { ImportedMeal } from "@/lib/ai/mdExtraction";
import { formatDayLabel } from "@/lib/dates";

export function ImportReview({
  today,
  days,
  catalogItems,
  facts,
  rules,
  bodyScans,
  warnings,
  included,
  pending,
  updateMeal,
  toggleMeal,
  toggleWorkout,
  toggleCatalogItem,
  toggleFact,
  toggleRule,
  toggleBodyScan,
  reset,
  commit,
}: {
  today: string;
  days: PreviewDay[];
  catalogItems: PreviewCatalogItem[];
  facts: PreviewFact[];
  rules: PreviewRule[];
  bodyScans: PreviewBodyScan[];
  warnings: string[];
  included: {
    meals: number;
    workouts: number;
    catalogItems: number;
    facts: number;
    rules: number;
    bodyScans: number;
  } | null;
  pending: boolean;
  updateMeal: (day: string, key: string, values: Partial<ImportedMeal>) => void;
  toggleMeal: (day: string, key: string, include: boolean) => void;
  toggleWorkout: (day: string, include: boolean) => void;
  toggleCatalogItem: (key: string, include: boolean) => void;
  toggleFact: (key: string, include: boolean) => void;
  toggleRule: (key: string, include: boolean) => void;
  toggleBodyScan: (takenAt: string, include: boolean) => void;
  reset: () => void;
  commit: () => void;
}) {
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

        {bodyScans.length ? (
          <Surface className="p-card">
            <p className="text-title font-medium tracking-(--tracking-snug)">
              InBody scans
            </p>
            <p className="mt-0.5 text-meta text-muted-foreground">
              Dates you already have a scan for are skipped.
            </p>
            <div className="mt-card divide-y divide-border">
              {bodyScans.map((s) => (
                <ImportBodyScanRow
                  key={s.taken_at}
                  scan={s}
                  onToggle={(include) => toggleBodyScan(s.taken_at, include)}
                />
              ))}
            </div>
          </Surface>
        ) : null}

        {rules.length ? (
          <Surface className="p-card">
            <p className="text-title font-medium tracking-(--tracking-snug)">
              Coach rules
            </p>
            <div className="mt-card divide-y divide-border">
              {rules.map((r) => (
                <ImportRuleRow
                  key={r.key}
                  rule={r}
                  onToggle={(include) => toggleRule(r.key, include)}
                />
              ))}
            </div>
          </Surface>
        ) : null}

        {facts.length ? (
          <Surface className="p-card">
            <p className="text-title font-medium tracking-(--tracking-snug)">
              Coach memory
            </p>
            <p className="mt-0.5 text-meta text-muted-foreground">
              Stored as long-term facts the coach uses to answer you.
            </p>
            <div className="mt-card divide-y divide-border">
              {facts.map((f) => (
                <ImportFactRow
                  key={f.key}
                  fact={f}
                  onToggle={(include) => toggleFact(f.key, include)}
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
            (!included.meals &&
              !included.workouts &&
              !included.catalogItems &&
              !included.facts &&
              !included.rules &&
              !included.bodyScans)
          }
          onClick={commit}
        >
          {pending ? "Importing..." : "Import"}
        </Button>
      </StickyActions>
    </div>
  );
}
