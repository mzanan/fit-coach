import type { ImportProgress, MdExtraction } from "@/lib/ai/mdExtraction";
import type { ImportFileStatus } from "@/lib/data/importFiles";
import { readNdjson } from "@/lib/ndjson";

export type { ImportFileStatus } from "@/lib/data/importFiles";

const EXTRACT_API = "/api/import/extract";

export type ExtractEvent =
  | ({ type: "progress" } & ImportProgress)
  | { type: "done"; extraction: MdExtraction }
  | { type: "error"; message: string };

export interface ExtractSource {
  name: string;
  text: string;
}

export async function startImportRun(
  sources: ExtractSource[],
): Promise<string> {
  const res = await fetch(EXTRACT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sources }),
  });
  const body = (await res.json().catch(() => null)) as {
    runId?: string;
    error?: string;
  } | null;
  if (!res.ok || !body?.runId) {
    throw new Error(body?.error ?? "Extraction failed");
  }
  return body.runId;
}

async function* readImportRun(
  runId: string,
  startIndex: number,
  signal: AbortSignal,
): AsyncGenerator<ExtractEvent> {
  const res = await fetch(
    `${EXTRACT_API}/${encodeURIComponent(runId)}?startIndex=${startIndex}`,
    { signal, headers: { Accept: "application/x-ndjson" } },
  );
  if (!res.ok || !res.body) throw new Error("Extraction failed");
  yield* readNdjson<ExtractEvent>(res.body);
}

const MAX_RECONNECTS = 20;

export async function* streamImportRun(
  runId: string,
  signal: AbortSignal,
  onReconnect?: () => void,
): AsyncGenerator<ExtractEvent> {
  let received = 0;
  let attempt = 0;
  for (;;) {
    try {
      for await (const event of readImportRun(runId, received, signal)) {
        received += 1;
        yield event;
      }
      return;
    } catch (error) {
      if (signal.aborted || attempt >= MAX_RECONNECTS) throw error;
      attempt += 1;
      onReconnect?.();
    }
  }
}

export async function cancelImportRun(runId: string): Promise<void> {
  const res = await fetch(
    `${EXTRACT_API}/${encodeURIComponent(runId)}/cancel`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error("Could not cancel the import");
}

export async function resumableImportRun(): Promise<string | null> {
  const res = await fetch(EXTRACT_API, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as {
    runId?: string | null;
  } | null;
  return body?.runId ?? null;
}

export async function forgetImportRun(runId: string): Promise<void> {
  await fetch(`${EXTRACT_API}/${encodeURIComponent(runId)}`, {
    method: "DELETE",
  });
}

export type ImportRunState = "running" | "completed" | "none";

export interface ImportFilesSnapshot {
  files: ImportFileStatus[];
  state: ImportRunState;
}

export class ImportFilesError extends Error {
  constructor(readonly status: number) {
    super(`Could not load the import files (HTTP ${status})`);
  }
}

export async function fetchImportFiles(): Promise<ImportFilesSnapshot> {
  const res = await fetch("/api/import/files", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new ImportFilesError(res.status);
  const body = (await res.json().catch(() => null)) as {
    files?: ImportFileStatus[];
    state?: ImportRunState;
  } | null;
  return { files: body?.files ?? [], state: body?.state ?? "running" };
}

export async function fetchSavedExtraction(): Promise<MdExtraction | null> {
  const res = await fetch("/api/import/saved", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Could not load the saved results");
  const body = (await res.json().catch(() => null)) as {
    extraction?: MdExtraction | null;
  } | null;
  return body?.extraction ?? null;
}

export const QUIET_WARNING_S = 90;

export function estimateRemainingMinutes(file: ImportFileStatus): number | null {
  if (file.status !== "processing" || file.chunkIndex === 0) return null;
  const elapsedMs = file.updatedAt - file.startedAt;
  const remaining = file.chunkTotal - file.chunkIndex;
  if (remaining <= 0 || elapsedMs <= 0) return null;
  const msPerChunk = elapsedMs / file.chunkIndex;
  return Math.max(1, Math.ceil((msPerChunk * remaining) / 60_000));
}
