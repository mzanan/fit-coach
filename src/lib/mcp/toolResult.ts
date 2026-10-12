const IN_APP_CONFIRMATION = /\s*The user confirms before anything is written\./g;

export function toolResultText(result: unknown): string {
  if (result === undefined) return "{}";
  return typeof result === "string" ? result : JSON.stringify(result);
}

export function toolTextContent(result: unknown) {
  return { content: [{ type: "text" as const, text: toolResultText(result) }] };
}

export function toolError(message: string) {
  return { ...toolTextContent({ error: message }), isError: true };
}

export function mcpToolDescription(description: unknown): string | undefined {
  if (typeof description !== "string") return undefined;
  return description.replace(IN_APP_CONFIRMATION, "").trim();
}

export interface ToolResult {
  isError?: boolean;
  content?: { type: string; text?: string }[];
}

export function futureDayError(day: string | null | undefined, today: string) {
  return day && day > today ? toolError(`${day} is in the future; today is ${today}.`) : null;
}

function payloadOf(result: ToolResult): unknown {
  const text = result.content?.find((part) => part.type === "text")?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function isFailedToolResult(result: ToolResult): boolean {
  if (result.isError) return true;
  const payload = payloadOf(result);
  if (!payload || typeof payload !== "object") return false;
  const fields = payload as Record<string, unknown>;
  return "error" in fields || fields.logged === false || fields.saved === false;
}
