const IN_APP_CONFIRMATION = /\s*The user confirms before anything is written\./g;

export function toolResultText(result: unknown): string {
  if (result === undefined) return "{}";
  return typeof result === "string" ? result : JSON.stringify(result);
}

export function mcpToolDescription(description: unknown): string | undefined {
  if (typeof description !== "string") return undefined;
  return description.replace(IN_APP_CONFIRMATION, "").trim();
}
