import "server-only";

import {
  mdExtraction,
  mergeExtractions,
  type MdExtraction,
} from "@/lib/ai/mdExtraction";
import { savedImportResults } from "@/lib/data/importFiles";

export async function loadSavedExtraction(
  userId: string,
): Promise<MdExtraction | null> {
  const stored = await savedImportResults(userId);
  const parts = stored.flatMap((json) => {
    try {
      const parsed = mdExtraction.safeParse(JSON.parse(json));
      return parsed.success ? [parsed.data] : [];
    } catch {
      return [];
    }
  });
  return parts.length ? mergeExtractions(parts) : null;
}
