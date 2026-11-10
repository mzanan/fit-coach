import type { MacroLine } from "@/lib/macros";

export function topNote(lines: MacroLine[]): string | null {
  const protein = lines.find((l) => l.key === "protein");
  if (protein?.state === "low") return "Short on protein";
  const fat = lines.find((l) => l.key === "fat");
  if (fat?.state === "low") return "Fat too low";
  return null;
}
