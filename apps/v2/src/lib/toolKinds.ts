import { READ_TOOL_PREFIXES } from "@/lib/constants";

export function isWriteTool(name: string): boolean {
  return !READ_TOOL_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function isReadOnlyCall(input: unknown): boolean {
  if (!input || typeof input !== "object") return false;
  const { action, command } = input as { action?: unknown; command?: unknown };
  return action === "list" || command === "view";
}
