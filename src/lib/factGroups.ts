export interface FactLine {
  id: string;
  domain: string;
  subject: string;
  content: string;
  scope: string | null;
  review_on: string | null;
}

export function groupFactsByDomain<T extends FactLine>(facts: T[]): Record<string, Omit<T, "domain">[]> {
  const groups: Record<string, Omit<T, "domain">[]> = {};
  for (const { domain, ...rest } of facts) {
    (groups[domain] ??= []).push(rest);
  }
  return groups;
}

export function factPromptLines(facts: FactLine[]): string[] {
  return Object.entries(groupFactsByDomain(facts)).flatMap(([domain, items]) => [
    `${domain}:`,
    ...items.map((fact) => `- ${fact.content}${fact.scope ? ` (${fact.scope})` : ""}`),
  ]);
}
