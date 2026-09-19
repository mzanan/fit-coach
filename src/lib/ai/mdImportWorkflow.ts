import "server-only";

import { APICallError } from "ai";
import { z } from "zod";
import {
  FatalError,
  RetryableError,
  getStepMetadata,
  getWritable,
} from "workflow";

import { userModelRef } from "@/lib/ai/aiCredentials";
import {
  chunkMarkdown,
  mdExtraction,
  mergeExtractions,
  usableSources,
  type ImportProgress,
  type ImportSource,
  type MdExtraction,
} from "@/lib/ai/mdExtraction";
import {
  extractChunk,
  extractionCacheKey,
  importChunkSize,
} from "@/lib/ai/mdImport";
import { cachedImportChunk, saveImportChunk } from "@/lib/data/importChunks";
import {
  cachedImportFile,
  finishImportFile,
  noteImportFileRetry,
  progressImportFile,
  startImportFile,
  touchImportFile,
} from "@/lib/data/importFiles";

export const NO_CREDENTIAL =
  "Add your AI provider key in Settings > AI; MD import needs AI";
const DEFAULT_RETRY_AFTER_MS = 60_000;
const MAX_RETRY_AFTER_MS = 300_000;
const REQUEST_TIMEOUT_MS = 120_000;
const BACKOFF_BASE_MS = 10_000;
const BACKOFF_MAX_MS = 60_000;
const CHUNK_CONCURRENCY = 6;

export function retryAfterMs(header: string | undefined): number {
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds * 1000, MAX_RETRY_AFTER_MS)
    : DEFAULT_RETRY_AFTER_MS;
}

export function backoffMs(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(BACKOFF_BASE_MS * 2 ** exponent, BACKOFF_MAX_MS);
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

function isConnectionError(error: unknown): boolean {
  if (APICallError.isInstance(error)) return !error.statusCode;
  return error instanceof TypeError && /fetch failed/i.test(error.message);
}

export type ImportEvent =
  | ({ type: "progress" } & ImportProgress)
  | { type: "done"; extraction: MdExtraction };

export interface MdImportInput {
  userId: string;
  sources: ImportSource[];
}

export async function mdImportWorkflow(
  input: MdImportInput,
): Promise<MdExtraction> {
  "use workflow";

  const usable = usableSources(input.sources);
  if (!usable.length) throw new FatalError("Nothing to import");

  const maxChars = await importChunkSizeStep(input.userId);
  const parts: MdExtraction[] = [];

  for (const [fileIndex, source] of usable.entries()) {
    const cached = await cachedImportFileStep(
      input.userId,
      source.name,
      source.text,
    );
    if (cached) {
      parts.push(cached);
      continue;
    }

    const chunks = chunkMarkdown(source.text, maxChars ?? undefined);
    const fileParts: MdExtraction[] = [];
    await startImportFileStep(
      input.userId,
      source.name,
      chunks.length,
      source.text,
    );

    let merged: MdExtraction;
    let fileError: string | null = null;
    try {
      for (let start = 0; start < chunks.length; start += CHUNK_CONCURRENCY) {
        const batch = chunks.slice(start, start + CHUNK_CONCURRENCY);
        await writeImportEventStep({
          type: "progress",
          file: source.name,
          fileIndex: fileIndex + 1,
          files: usable.length,
          chunk: start + 1,
          chunks: chunks.length,
        });
        const results = await Promise.all(
          batch.map((chunkText, offset) =>
            extractChunkStep(
              input.userId,
              source.name,
              chunkText,
              start + offset,
              chunks.length,
            ),
          ),
        );
        fileParts.push(...results);
        await progressImportFileStep(
          input.userId,
          source.name,
          start + batch.length,
        );
      }
      const result = mergeExtractions(fileParts);
      merged = {
        ...result,
        warnings: result.warnings.map(
          (warning) => `${source.name}: ${warning}`,
        ),
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      if (FatalError.is(error)) {
        await persistImportFileResult(input.userId, source.name, reason, null);
        throw error;
      }
      const partial = mergeExtractions(fileParts);
      merged = {
        ...partial,
        warnings: [
          ...partial.warnings.map((warning) => `${source.name}: ${warning}`),
          `${source.name}: stopped after ${fileParts.length} of ${chunks.length} parts: ${reason}`,
        ],
      };
      fileError = reason;
    }

    parts.push(merged);
    await persistImportFileResult(
      input.userId,
      source.name,
      fileError,
      fileError ? null : JSON.stringify(merged),
    );
  }

  const extraction = mergeExtractions(parts);
  await writeImportEventStep({ type: "done", extraction }, true);
  return extraction;
}

export async function importChunkSizeStep(
  userId: string,
): Promise<number | null> {
  "use step";

  const ref = await userModelRef(userId);
  if (!ref) throw new FatalError(NO_CREDENTIAL);
  return importChunkSize(ref) ?? null;
}

export async function writeImportEventStep(
  event: ImportEvent,
  closeAfter = false,
): Promise<void> {
  "use step";

  const writer = getWritable<ImportEvent>().getWriter();
  await writer.write(event);
  if (closeAfter) await writer.close();
  else writer.releaseLock();
}

export async function extractChunkStep(
  userId: string,
  fileName: string,
  chunkText: string,
  index: number,
  total: number,
): Promise<MdExtraction> {
  "use step";

  const cached = await readCachedChunk(userId, chunkText);
  if (cached) return cached;

  const { attempt } = getStepMetadata();
  console.log(`md import: part ${index + 1}/${total}, attempt ${attempt}`);
  await touchImportFile(userId, fileName).catch((error) =>
    console.error("md import: could not touch file status", error),
  );

  const ref = await userModelRef(userId);
  if (!ref) throw new FatalError(NO_CREDENTIAL);

  try {
    const result = await extractChunk(
      ref,
      chunkText,
      index,
      total,
      AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    );
    await saveImportChunk(
      userId,
      extractionCacheKey(chunkText),
      JSON.stringify(result),
    ).catch(
      (error) => console.error("md import: could not save part", error),
    );
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`md import: part ${index + 1} did not match the schema`);
      return skippedPart(
        index,
        `Part ${index + 1} could not be parsed and was skipped.`,
      );
    }

    const retry = async (reason: string, wait: number): Promise<never> => {
      await noteImportFileRetry(
        userId,
        fileName,
        `${reason}. Retry ${attempt + 1} in ${Math.round(wait / 1000)}s`,
      ).catch((e) => console.error("md import: could not note retry", e));
      throw new RetryableError(reason, { retryAfter: wait });
    };

    if (isConnectionError(error)) {
      return retry(
        `Could not reach ${ref.provider}/${ref.model}`,
        backoffMs(attempt),
      );
    }
    if (isTimeoutError(error)) {
      return retry(
        `${ref.provider}/${ref.model} did not respond within ${REQUEST_TIMEOUT_MS / 1000}s`,
        backoffMs(attempt),
      );
    }
    if (APICallError.isInstance(error)) {
      const status = error.statusCode ?? 0;
      if (status === 429 || status >= 500) {
        return retry(
          error.message,
          retryAfterMs(error.responseHeaders?.["retry-after"]),
        );
      }
    }
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`md import: part ${index + 1} rejected by the model`, reason);
    return skippedPart(index, `Part ${index + 1} was rejected and skipped: ${reason}`);
  }
}
extractChunkStep.maxRetries = 6;

function skippedPart(index: number, warning: string): MdExtraction {
  return {
    days: [],
    catalog_items: [],
    facts: [],
    rules: [],
    body_scans: [],
    warnings: [warning],
  };
}

async function readCachedChunk(
  userId: string,
  chunkText: string,
): Promise<MdExtraction | null> {
  const stored = await cachedImportChunk(
    userId,
    extractionCacheKey(chunkText),
  ).catch((error) => {
    console.error("md import: could not read saved part", error);
    return null;
  });
  if (!stored) return null;
  try {
    const parsed = mdExtraction.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function cachedImportFileStep(
  userId: string,
  name: string,
  text: string,
): Promise<MdExtraction | null> {
  "use step";

  const stored = await cachedImportFile(userId, name, extractionCacheKey(text));
  if (!stored) return null;
  try {
    return JSON.parse(stored) as MdExtraction;
  } catch (error) {
    console.error("md import: stored result is not valid JSON", error);
    return null;
  }
}

export async function startImportFileStep(
  userId: string,
  name: string,
  chunkTotal: number,
  text: string,
): Promise<void> {
  "use step";

  await startImportFile(userId, name, chunkTotal, extractionCacheKey(text));
}

export async function progressImportFileStep(
  userId: string,
  name: string,
  chunkIndex: number,
): Promise<void> {
  "use step";

  await progressImportFile(userId, name, chunkIndex);
}

export async function finishImportFileStep(
  userId: string,
  name: string,
  error: string | null,
  result: string | null,
): Promise<void> {
  "use step";

  await finishImportFile(userId, name, error, result);
}

async function persistImportFileResult(
  userId: string,
  name: string,
  error: string | null,
  result: string | null,
): Promise<void> {
  try {
    await finishImportFileStep(userId, name, error, result);
  } catch (persistError) {
    console.error("md import: could not persist file status", persistError);
  }
}
