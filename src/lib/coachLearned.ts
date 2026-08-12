export function parseLearned(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const facts = Array.isArray(parsed)
      ? parsed
      : (parsed as { facts?: unknown })?.facts;
    if (!Array.isArray(facts)) return [];
    return facts.filter((fact): fact is string => typeof fact === "string");
  } catch {
    return [];
  }
}

export function serializeLearned(facts: string[]): string {
  return JSON.stringify(facts);
}
