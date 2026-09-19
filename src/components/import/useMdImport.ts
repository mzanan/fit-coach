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
  fetchImportFiles,
  fetchSavedExtraction,
  forgetImportRun,
  ImportFilesError,
  resumableImportRun,
  startImportRun,
  streamImportRun,
  type ImportFileStatus,
  type ImportFilesSnapshot,
} from "@/lib/importStream";
import {
  sourcesBytes,
  type ImportedMeal,
  type MdExtraction,
} from "@/lib/ai/mdExtraction";
import { IMPORT_MAX_BYTES, IMPORT_TOO_LARGE } from "@/lib/constants";
import {
  toPreviewBodyScans,
  toPreviewCatalogItems,
  toPreviewDays,
  toPreviewFacts,
  toPreviewRules,
  withoutInclude,
  type PreviewBodyScan,
  type PreviewCatalogItem,
  type PreviewDay,
  type PreviewFact,
  type PreviewRule,
} from "@/lib/importPreview";

export type {
  PreviewBodyScan,
  PreviewCatalogItem,
  PreviewDay,
  PreviewFact,
  PreviewMeal,
  PreviewRule,
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
  const [facts, setFacts] = useState<PreviewFact[]>([]);
  const [rules, setRules] = useState<PreviewRule[]>([]);
  const [bodyScans, setBodyScans] = useState<PreviewBodyScan[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<ImportFileStatus[]>([]);
  const activeRun = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const sessionWarned = useRef(false);

  useEffect(() => {
    return () => controller?.abort();
  }, [controller]);

  const running = progress !== null;

  const applySnapshot = useCallback((snapshot: ImportFilesSnapshot) => {
    setFiles(snapshot.files);
    if (snapshot.state !== "none" || !activeRun.current) return;

    const id = activeRun.current;
    activeRun.current = null;
    controllerRef.current?.abort();
    const message =
      snapshot.files.find((file) => file.status === "error")?.error ??
      "The import stopped on the server. Start it again.";
    setRunId(null);
    setProgress(null);
    setError(message);
    toast.error(message);
    void forgetImportRun(id).catch((failed) =>
      console.error("md import: forget failed", failed),
    );
  }, []);

  const applyExtraction = useCallback((result: MdExtraction) => {
    setDays(toPreviewDays(result));
    setCatalogItems(toPreviewCatalogItems(result));
    setFacts(toPreviewFacts(result));
    setRules(toPreviewRules(result));
    setBodyScans(toPreviewBodyScans(result));
    setWarnings(result.warnings);
  }, []);

  const handleFilesError = useCallback((failed: unknown) => {
    if (failed instanceof ImportFilesError && failed.status === 401) {
      if (sessionWarned.current) return;
      sessionWarned.current = true;
      toast.error(
        "Your session expired, so progress can't refresh. Sign in again: the import keeps running on the server.",
      );
      return;
    }
    console.error("md import: files refresh failed", failed);
  }, []);

  const refreshFiles = useCallback(
    () => fetchImportFiles().then(applySnapshot).catch(handleFilesError),
    [applySnapshot, handleFilesError],
  );

  useEffect(() => {
    void fetchImportFiles().then(applySnapshot).catch(handleFilesError);
  }, [applySnapshot, handleFilesError]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      void fetchImportFiles().then(applySnapshot).catch(handleFilesError);
    }, 5000);
    return () => clearInterval(id);
  }, [running, applySnapshot, handleFilesError]);

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
        if (event.chunk === 1) {
          void refreshFiles();
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.name === event.file
                ? {
                    ...f,
                    chunkIndex: event.chunk,
                    chunkTotal: event.chunks,
                    updatedAt: Date.now(),
                  }
                : f,
            ),
          );
        }
      } else if (event.type === "done") {
        result = event.extraction;
      } else {
        failure = event.message;
        break;
      }
    }

    if (activeRun.current !== id) return;
    activeRun.current = null;
    void refreshFiles();

    if (failure) {
      setRunId(null);
      await forgetImportRun(id).catch((error) =>
        console.error("md import: forget failed", error),
      );
      throw new Error(failure);
    }
    if (!result) {
      throw new Error(
        "Lost the connection to the server, but your import may still be running there. Tap Reconnect to check.",
      );
    }

    applyExtraction(result);
    setRunId(null);
    await forgetImportRun(id).catch((error) =>
      console.error("md import: forget failed", error),
    );
  }, [refreshFiles, applyExtraction]);

  const reconnect = useCallback(
    async (signal: AbortSignal) => {
      const found = await resumableImportRun().catch(() => null);
      if (!found || signal.aborted || activeRun.current) return;
      setError(null);
      setRunId(found);
      setProgress("Picking up the import you left running");
      try {
        await consumeRun(found, signal);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          const message = e instanceof Error ? e.message : "Extraction failed";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!signal.aborted) setProgress(null);
      }
    },
    [consumeRun],
  );

  useEffect(() => {
    const abort = new AbortController();
    controllerRef.current = abort;
    async function run() {
      await reconnect(abort.signal);
    }
    void run();
    return () => abort.abort();
  }, [reconnect]);

  function retryConnection() {
    const abort = new AbortController();
    setController(abort);
    controllerRef.current = abort;
    void reconnect(abort.signal).finally(() => {
      if (!abort.signal.aborted) setController(null);
    });
  }

  function extract() {
    startTransition(async () => {
      setError(null);
      setProgress("Sending your files");
      const abort = new AbortController();
      setController(abort);
      controllerRef.current = abort;
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
          const message = e instanceof Error ? e.message : "Extraction failed";
          setError(message);
          toast.error(message);
        }
      } finally {
        setProgress(null);
        setController(null);
      }
    });
  }

  function openSaved() {
    startTransition(async () => {
      setError(null);
      try {
        const saved = await fetchSavedExtraction();
        if (!saved) {
          toast.error("There are no saved results to review yet");
          return;
        }
        applyExtraction(saved);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load the saved results");
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
    if (sourcesBytes([...attachments, ...kept]) > IMPORT_MAX_BYTES) {
      toast.error(IMPORT_TOO_LARGE);
      return;
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
    controllerRef.current?.abort();
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

  function toggleFact(key: string, include: boolean) {
    setFacts((prev) => prev.map((f) => (f.key === key ? { ...f, include } : f)));
  }

  function toggleRule(key: string, include: boolean) {
    setRules((prev) => prev.map((r) => (r.key === key ? { ...r, include } : r)));
  }

  function toggleBodyScan(takenAt: string, include: boolean) {
    setBodyScans((prev) =>
      prev.map((s) => (s.taken_at === takenAt ? { ...s, include } : s)),
    );
  }

  function reset() {
    setDays(null);
    setCatalogItems([]);
    setFacts([]);
    setRules([]);
    setBodyScans([]);
    setWarnings([]);
    setError(null);
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
          facts: facts
            .filter((f) => f.include)
            .map((f) => ({
              content: f.content,
              category: f.category,
              subject: f.subject,
            })),
          rules: rules
            .filter((r) => r.include)
            .map((r) => ({ key: r.key, value: r.value })),
          body_scans: bodyScans
            .filter((s) => s.include)
            .map(withoutInclude),
          warnings: [],
        };
        const result = await commitMdImport(payload);
        const skipped = result.skippedDuplicates + result.skippedCatalogItems;
        toast.success(
          `Imported ${result.meals} meals, ${result.workouts} workouts, ${result.catalogItems} catalog items, ${result.facts} facts, ${result.rules} rules, ${result.bodyScans} body scans${
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
        facts: facts.filter((f) => f.include).length,
        rules: rules.filter((r) => r.include).length,
        bodyScans: bodyScans.filter((s) => s.include).length,
      }
    : null;

  const savedCount = files.filter((file) => file.status === "done").length;

  return {
    pending,
    running,
    mdText,
    setMdText,
    attachFiles,
    attachments,
    files,
    savedCount,
    openSaved,
    progress,
    error,
    retryConnection,
    cancelExtraction,
    removeAttachment,
    extract,
    days,
    catalogItems,
    facts,
    rules,
    bodyScans,
    warnings,
    included,
    updateMeal,
    toggleMeal,
    toggleWorkout,
    toggleCatalogItem,
    toggleFact,
    toggleRule,
    toggleBodyScan,
    reset,
    commit,
  };
}
