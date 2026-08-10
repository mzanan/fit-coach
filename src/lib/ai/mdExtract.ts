import "server-only";

import {
  extractFromMarkdown,
  mergeExtractions,
  type MdExtraction,
} from "@/lib/ai/mdImport";
import { userModelRef } from "@/lib/ai/aiCredentials";

export interface ImportSource {
  name: string;
  text: string;
}

export interface ImportProgress {
  file: string;
  fileIndex: number;
  files: number;
  chunk: number;
  chunks: number;
}

export async function runMdExtraction(
  userId: string,
  sources: ImportSource[],
  onProgress: (progress: ImportProgress) => void,
  signal?: AbortSignal,
): Promise<MdExtraction> {
  const ref = await userModelRef(userId);
  if (!ref) {
    throw new Error("Add your AI provider key in Settings > AI; MD import needs AI");
  }

  const usable = sources
    .map((source) => ({ name: source.name, text: source.text.trim() }))
    .filter((source) => source.text.length > 0);
  if (!usable.length) throw new Error("Nothing to import");

  const parts: MdExtraction[] = [];
  for (const [index, source] of usable.entries()) {
    if (signal?.aborted) break;
    try {
      const part = await extractFromMarkdown(
        ref,
        source.text,
        (chunk, chunks) =>
          onProgress({
            file: source.name,
            fileIndex: index + 1,
            files: usable.length,
            chunk: chunk + 1,
            chunks,
          }),
        signal,
      );
      parts.push({
        ...part,
        warnings: part.warnings.map((warning) => `${source.name}: ${warning}`),
      });
    } catch (error) {
      if (signal?.aborted) break;
      console.error(`md import: ${source.name} failed`, error);
      const reason = error instanceof Error ? error.message : "unknown error";
      parts.push({
        days: [],
        catalog_items: [],
        warnings: [`${source.name} could not be read and was skipped: ${reason}`],
      });
    }
  }
  if (!parts.length) throw new Error("Nothing could be extracted");
  return mergeExtractions(parts);
}

