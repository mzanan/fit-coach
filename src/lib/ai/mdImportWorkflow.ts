import "server-only";

import { APICallError } from "ai";
import {
  FatalError,
  RetryableError,
  getStepMetadata,
  getWritable,
} from "workflow";

import { userModelRef } from "@/lib/ai/aiCredentials";
import {
  chunkMarkdown,
  mergeExtractions,
  usableSources,
  type ImportProgress,
  type ImportSource,
  type MdExtraction,
} from "@/lib/ai/mdExtraction";
import { extractChunk, importChunkSize } from "@/lib/ai/mdImport";

export const NO_CREDENTIAL =
  "Add your AI provider key in Settings > AI; MD import needs AI";
const DEFAULT_RETRY_AFTER_MS = 60_000;

export function retryAfterMs(header: string | undefined): number {
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0
    ? seconds * 1000
    : DEFAULT_RETRY_AFTER_MS;
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
    const chunks = chunkMarkdown(source.text, maxChars ?? undefined);
    const fileParts: MdExtraction[] = [];
    try {
      for (let i = 0; i < chunks.length; i++) {
        await writeImportEventStep({
          type: "progress",
          file: source.name,
          fileIndex: fileIndex + 1,
          files: usable.length,
          chunk: i + 1,
          chunks: chunks.length,
        });
        fileParts.push(
          await extractChunkStep(input.userId, chunks[i], i, chunks.length),
        );
      }
      const merged = mergeExtractions(fileParts);
      parts.push({
        ...merged,
        warnings: merged.warnings.map(
          (warning) => `${source.name}: ${warning}`,
        ),
      });
    } catch (error) {
      if (FatalError.is(error)) throw error;
      const reason = error instanceof Error ? error.message : "unknown error";
      parts.push({
        days: [],
        catalog_items: [],
        warnings: [
          `${source.name} could not be read and was skipped: ${reason}`,
        ],
      });
    }
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
  chunkText: string,
  index: number,
  total: number,
): Promise<MdExtraction> {
  "use step";

  const { attempt } = getStepMetadata();
  console.log(`md import: part ${index + 1}/${total}, attempt ${attempt}`);

  const ref = await userModelRef(userId);
  if (!ref) throw new FatalError(NO_CREDENTIAL);

  try {
    return await extractChunk(ref, chunkText, index, total);
  } catch (error) {
    if (!APICallError.isInstance(error)) throw error;
    const status = error.statusCode ?? 0;
    if (status !== 429 && status < 500) throw error;
    throw new RetryableError(error.message, {
      retryAfter: retryAfterMs(error.responseHeaders?.["retry-after"]),
    });
  }
}
extractChunkStep.maxRetries = 3;
