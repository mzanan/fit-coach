import type { InbodyExtraction } from "@/lib/ai/inbody";
import {
  INBODY_NUMERIC_KEYS,
  INBODY_TEXT_KEYS,
} from "@/lib/constants";

export interface ScanDraft {
  taken_at: string;
  notes: string;
  values: Record<string, string>;
  texts: Record<string, string>;
}

export function toDraft(x: InbodyExtraction): ScanDraft {
  const record = x as unknown as Record<string, unknown>;
  return {
    taken_at: x.test_datetime?.slice(0, 16).replace(" ", "T") ?? "",
    notes: "",
    values: Object.fromEntries(
      INBODY_NUMERIC_KEYS.map((key) => {
        const value = record[key];
        return [key, value == null ? "" : String(value)];
      }),
    ),
    texts: Object.fromEntries(
      INBODY_TEXT_KEYS.map((key) => {
        const value = record[key];
        return [key, value == null ? "" : String(value)];
      }),
    ),
  };
}
