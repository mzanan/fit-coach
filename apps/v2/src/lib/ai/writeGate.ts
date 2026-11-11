export const WRITE_BLOCKED_MODELS = new Set<string>([]);

export function isWriteBlocked(model: string): boolean {
  return WRITE_BLOCKED_MODELS.has(model);
}
