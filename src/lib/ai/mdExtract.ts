import "server-only";

import {
  extractFromMarkdown,
  mergeExtractions,
  type MdExtraction,
} from "@/lib/ai/mdImport";
import { userModelRef } from "@/lib/ai/providers";

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
    const part = await extractFromMarkdown(ref, source.text, (chunk, chunks) =>
      onProgress({
        file: source.name,
        fileIndex: index + 1,
        files: usable.length,
        chunk: chunk + 1,
        chunks,
      }),
    );
    parts.push({
      ...part,
      warnings: part.warnings.map((warning) => `${source.name}: ${warning}`),
    });
  }
  return mergeExtractions(parts);
}

