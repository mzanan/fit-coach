export function toolResultText(result: unknown): string {
  if (result === undefined) return "{}";
  return typeof result === "string" ? result : JSON.stringify(result);
}
