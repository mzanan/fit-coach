"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { commitMdImport } from "@/lib/actions/mdImport";
import type { MdExtraction } from "@/lib/ai/mdImport";
import type {
  ImportedCatalogItem,
  ImportedMeal,
  ImportedWorkout,
} from "@/lib/ai/mdImport";

export interface PreviewMeal extends ImportedMeal {
  key: string;
  include: boolean;
}

export interface PreviewWorkout {
  workout: ImportedWorkout;
  include: boolean;
}

export interface PreviewDay {
  day: string;
  meals: PreviewMeal[];
  workout: PreviewWorkout | null;
}

export interface PreviewCatalogItem extends ImportedCatalogItem {
  key: string;
  include: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  text: string;
}

export function useMdImport() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mdText, setMdText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [days, setDays] = useState<PreviewDay[] | null>(null);
  const [catalogItems, setCatalogItems] = useState<PreviewCatalogItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);

  useEffect(() => {
    return () => controller?.abort();
  }, [controller]);

  function extract() {
    startTransition(async () => {
      setProgress("Sending your files");
      const abort = new AbortController();
      setController(abort);
      try {
        const res = await fetch("/api/import/extract", {
          method: "POST",
          signal: abort.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sources: [
              ...attachments.map((file) => ({
                name: file.name,
                text: file.text,
              })),
              ...(mdText.trim()
                ? [{ name: "Pasted text", text: mdText }]
                : []),
            ],
          }),
        });
        if (!res.ok || !res.body) throw new Error("Extraction failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let result: MdExtraction | null = null;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as
              | {
                  type: "progress";
                  file: string;
                  fileIndex: number;
                  files: number;
                  chunk: number;
                  chunks: number;
                }
              | { type: "done"; extraction: MdExtraction }
              | { type: "error"; message: string };
            if (event.type === "progress") {
              setProgress(
                `${event.file} (${event.fileIndex} of ${event.files}), part ${event.chunk} of ${event.chunks}`,
              );
            } else if (event.type === "done") {
              result = event.extraction;
            } else {
              throw new Error(event.message);
            }
          }
        }
        if (!result) throw new Error("Extraction returned nothing");

        setDays(
          result.days.map((d, di) => ({
            day: d.day,
            meals: d.meals.map((m, mi) => ({
              ...m,
              key: `${di}-${mi}`,
              include: true,
            })),
            workout: d.workout ? { workout: d.workout, include: true } : null,
          })),
        );
        setCatalogItems(
          result.catalog_items.map((c, i) => ({
            ...c,
            key: `c-${i}`,
            include: true,
          })),
        );
        setWarnings(result.warnings);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          toast.error(e instanceof Error ? e.message : "Extraction failed");
        }
      } finally {
        setProgress(null);
        setController(null);
      }
    });
  }

  async function attachFiles(files: File[]) {
    const loaded = await Promise.all(
      files.map(async (file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        text: (await file.text()).trim(),
      })),
    );
    const kept = loaded.filter((file) => file.text.length > 0);
    if (!kept.length) {
      toast.error("Those files are empty");
      return;
    }
    if (kept.length < loaded.length) {
      toast(`${loaded.length - kept.length} empty file(s) skipped`);
    }
    setAttachments((current) => [
      ...current,
      ...kept.filter((file) => !current.some((a) => a.id === file.id)),
    ]);
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((file) => file.id !== id));
  }

  function cancelExtraction() {
    controller?.abort();
  }

  function updateMeal(day: string, key: string, values: Partial<ImportedMeal>) {
    setDays(
      (prev) =>
        prev?.map((d) =>
          d.day === day
            ? {
                ...d,
                meals: d.meals.map((m) =>
                  m.key === key ? { ...m, ...values } : m,
                ),
              }
            : d,
        ) ?? null,
    );
  }

  function toggleMeal(day: string, key: string, include: boolean) {
    updateMeal(day, key, { include } as Partial<ImportedMeal>);
  }

  function toggleWorkout(day: string, include: boolean) {
    setDays(
      (prev) =>
        prev?.map((d) =>
          d.day === day && d.workout
            ? { ...d, workout: { ...d.workout, include } }
            : d,
        ) ?? null,
    );
  }

  function toggleCatalogItem(key: string, include: boolean) {
    setCatalogItems((prev) =>
      prev.map((c) => (c.key === key ? { ...c, include } : c)),
    );
  }

  function reset() {
    setDays(null);
    setCatalogItems([]);
    setWarnings([]);
  }

  function commit() {
    if (!days) return;
    startTransition(async () => {
      try {
        const payload = {
          days: days
            .map((d) => ({
              day: d.day,
              meals: d.meals
                .filter((m) => m.include)
                .map((m) => ({
                  category: m.category,
                  name: m.name,
                  place: m.place,
                  fat_quality: m.fat_quality,
                  protein_g: m.protein_g,
                  fat_g: m.fat_g,
                  carbs_g: m.carbs_g,
                })),
              workout: d.workout?.include ? d.workout.workout : null,
            }))
            .filter((d) => d.meals.length || d.workout),
          catalog_items: catalogItems
            .filter((c) => c.include)
            .map((c) => ({
              name: c.name,
              place: c.place,
              fat_quality: c.fat_quality,
              notes: c.notes,
              protein_g: c.protein_g,
              fat_g: c.fat_g,
              carbs_g: c.carbs_g,
            })),
          warnings: [],
        };
        const result = await commitMdImport(payload);
        toast.success(
          `Imported ${result.meals} meals, ${result.workouts} workouts, ${result.catalogItems} catalog items`,
        );
        router.push("/");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Import failed");
      }
    });
  }

  const included = days
    ? {
        meals: days.reduce(
          (n, d) => n + d.meals.filter((m) => m.include).length,
          0,
        ),
        workouts: days.filter((d) => d.workout?.include).length,
        catalogItems: catalogItems.filter((c) => c.include).length,
      }
    : null;

  return {
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
  };
}
