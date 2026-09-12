import type { ImportProgress, MdExtraction } from "@/lib/ai/mdExtraction";
import { readNdjson } from "@/lib/ndjson";

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

export async function* streamImportRun(
  runId: string,
  signal: AbortSignal,
  onReconnect?: () => void,
): AsyncGenerator<ExtractEvent> {
  let received = 0;
  let reconnected = false;
  for (;;) {
    try {
      for await (const event of readImportRun(runId, received, signal)) {
        received += 1;
        yield event;
      }
      return;
    } catch (error) {
      if (signal.aborted || reconnected) throw error;
      reconnected = true;
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
