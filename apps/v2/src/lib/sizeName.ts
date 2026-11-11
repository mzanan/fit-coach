import { normalizeSearch } from "@/lib/search";

const SIZE_UNITS = "g|gr|grs|gram|grams|kg|ml|l|oz";
const SIZE_PREFIX = new RegExp(`^\\s*[\\d.,]+\\s*(${SIZE_UNITS})?\\b\\s*`, "i");
const SIZED_NAME = new RegExp(`^\\s*(\\d+(?:[.,]\\d+)?)\\s*(${SIZE_UNITS})\\b\\s*(.*)$`, "i");

export function sizeVariantKey(name: string): string {
  return normalizeSearch(name).replace(SIZE_PREFIX, "").trim();
}

export function hasSizePrefix(name: string): boolean {
  return SIZED_NAME.test(name);
}

export function scaledSizeName(name: string, portions: number): string {
  const match = SIZED_NAME.exec(name);
  if (!match || portions === 1) return name;
  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return name;
  const scaled = Math.round(amount * portions * 100) / 100;
  return `${scaled}${match[2]} ${match[3]}`.trim();
}
