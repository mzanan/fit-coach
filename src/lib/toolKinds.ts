const READ_TOOL = /^(get_|search_|suggest_|check_)/;

export function isWriteTool(name: string): boolean {
  return !READ_TOOL.test(name);
}
