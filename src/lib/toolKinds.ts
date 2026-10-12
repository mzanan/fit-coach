import { READ_TOOL_PREFIXES } from "@/lib/constants";

export function isWriteTool(name: string): boolean {
  return !READ_TOOL_PREFIXES.some((prefix) => name.startsWith(prefix));
}
