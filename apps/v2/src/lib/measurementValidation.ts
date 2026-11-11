import { MEASUREMENT_VALUE_MAX } from "@/lib/constants";

export function validateMeasurementInput(raw: string): string | null {
  if (!raw.trim()) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return "Enter a positive number";
  if (parsed > MEASUREMENT_VALUE_MAX) {
    return `Must be under ${MEASUREMENT_VALUE_MAX}`;
  }
  return null;
}
