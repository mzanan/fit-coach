"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { commitMdImport } from "@/lib/actions/mdImport";
import {
  cancelImportRun,
  forgetImportRun,
  resumableImportRun,
  startImportRun,
  streamImportRun,
} from "@/lib/importStream";
import type { ImportedMeal, MdExtraction } from "@/lib/ai/mdExtraction";
import {
  toPreviewCatalogItems,
  toPreviewDays,
  type PreviewCatalogItem,
  type PreviewDay,
} from "@/lib/importPreview";

export type {
  PreviewCatalogItem,
  PreviewDay,
  PreviewMeal,
  PreviewWorkout,
} from "@/lib/importPreview";

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
  const [runId, setRunId] = useState<string | null>(null);
  const activeRun = useRef<string | null>(null);

  useEffect(() => {
    return () => controller?.abort();
  }, [controller]);

  const consumeRun = useCallback(async (id: string, signal: AbortSignal) => {
    activeRun.current = id;
    let result: MdExtraction | null = null;
    let failure: string | null = null;

    for await (const event of streamImportRun(id, signal, () =>
      setProgress("Reconnecting"),
    )) {
      if (activeRun.current !== id) return;
      if (event.type === "progress") {
        setProgress(
          `${event.file} (${event.fileIndex} of ${event.files}), part ${event.chunk} of ${event.chunks}`,
        );
      } else if (event.type === "done") {
        result = event.extraction;
      } else {
        failure = event.message;
        break;
      }
    }

    if (activeRun.current !== id) return;
    activeRun.current = null;

    if (failure) {
      setRunId(null);
      await forgetImportRun(id).catch((error) =>
        console.error("md import: forget failed", error),
      );
      throw new Error(failure);
    }
    if (!result) throw new Error("Extraction returned nothing");

    setDays(toPreviewDays(result));
    setCatalogItems(toPreviewCatalogItems(result));
    setWarnings(result.warnings);
    setRunId(null);
    await forgetImportRun(id).catch((error) =>
      console.error("md import: forget failed", error),
    );
  }, []);

  useEffect(() => {
    let dropped = false;
    const abort = new AbortController();

    async function rejoin() {
      const found = await resumableImportRun().catch(() => null);
      if (!found || dropped || activeRun.current) return;
      setRunId(found);
      setController(abort);
      setProgress("Picking up the import you left running");
      try {
        await consumeRun(found, abort.signal);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast.error(
            error instanceof Error ? error.message : "Extraction failed",
          );
        }
      } finally {
        if (!dropped) {
          setProgress(null);
          setController(null);
        }
      }
    }

    void rejoin();
    return () => {
      dropped = true;
      abort.abort();
    };
  }, [consumeRun]);

  function extract() {
    startTransition(async () => {
      setProgress("Sending your files");
      const abort = new AbortController();
      setController(abort);
      try {
        const started = await startImportRun([
          ...attachments.map((file) => ({
            name: file.name,
            text: file.text,
          })),
          ...(mdText.trim() ? [{ name: "Pasted text", text: mdText }] : []),
        ]);
        setRunId(started);
        if (abort.signal.aborted) {
          dropRun(started);
          return;
        }
        await consumeRun(started, abort.signal);
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

  function dropRun(id: string) {
    if (activeRun.current === id) activeRun.current = null;
    setRunId(null);
    void cancelImportRun(id)
      .then(() => forgetImportRun(id))
      .catch((error) =>
        console.error("md import: cancel failed, run kept", error),
      );
  }

  function cancelExtraction() {
    controller?.abort();
    if (runId) dropRun(runId);
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
    if (runId) dropRun(runId);
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
        const skipped = result.skippedDuplicates + result.skippedCatalogItems;
        toast.success(
          `Imported ${result.meals} meals, ${result.workouts} workouts, ${result.catalogItems} catalog items${
            skipped ? `. ${skipped} already there, skipped` : ""
          }`,
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
    running: progress !== null,
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
