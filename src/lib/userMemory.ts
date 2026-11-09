import { FACT_SUBJECT_MAX, LOCATION_MAX, LOCATION_SCOPE_PREFIX, RULE_KEY_MAX } from "@/lib/constants";

export interface FactLine {
  id: string;
  domain: string;
  subject: string;
  content: string;
  scope: string | null;
  review_on: string | null;
}

interface OpenHealthLine {
  kind: string;
  title: string;
  started_on: string;
}

interface PendingItemLine {
  kind: string;
  text: string;
  due_on: string | null;
}

function slug(value: string, separators: RegExp): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(separators, "_")
    .replace(/^_+|_+$/g, "");
}

export function ruleKey(value: string | null | undefined): string | null {
  if (!value) return null;
  return slug(value, /[^a-z0-9]+/g).slice(0, RULE_KEY_MAX) || null;
}

export function factSubject(value: string | null | undefined): string | null {
  if (!value) return null;
  return slug(value, /[^\p{L}\p{N}]+/gu).slice(0, FACT_SUBJECT_MAX) || null;
}

export function factScope(value: string | null | undefined): string | null {
  if (!value) return null;
  return slug(value, /[^\p{L}\p{N}:]+/gu).replace(/_*:_*/g, ":") || null;
}

export function locationSlug(value: string | null | undefined): string | null {
  if (!value) return null;
  return slug(value, /[^\p{L}\p{N}]+/gu).slice(0, LOCATION_MAX) || null;
}

function cityKey(value: string): string {
  return value.replace(/_/g, "");
}

function scopeCity(scope: string | null): string | null {
  if (!scope?.startsWith(LOCATION_SCOPE_PREFIX)) return null;
  return scope.slice(LOCATION_SCOPE_PREFIX.length).split(":")[0] ?? "";
}

export function knownCities(facts: { scope: string | null }[]): string[] {
  const cities = facts.map((fact) => scopeCity(fact.scope)).filter((city): city is string => Boolean(city));
  return [...new Set(cities)].sort();
}

export function canonicalCity(location: string, cities: string[]): string {
  return cities.find((city) => cityKey(city) === cityKey(location)) ?? location;
}

export function factsForLocation<T extends { scope: string | null }>(facts: T[], currentLocation: string | null): T[] {
  if (!currentLocation) return facts;
  return facts.filter((fact) => {
    const city = scopeCity(fact.scope);
    return city === null || cityKey(city) === cityKey(currentLocation);
  });
}

export function groupFactsByDomain<T extends FactLine>(facts: T[]): Record<string, Omit<T, "domain">[]> {
  const groups: Record<string, Omit<T, "domain">[]> = {};
  for (const { domain, ...rest } of facts) {
    (groups[domain] ??= []).push(rest);
  }
  return groups;
}

function singleLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function factPromptLines(facts: FactLine[]): string[] {
  return Object.entries(groupFactsByDomain(facts)).flatMap(([domain, items]) => [
    `${domain}:`,
    ...items.map((fact) => `- ${singleLine(fact.content)}${fact.scope ? ` (${singleLine(fact.scope)})` : ""}`),
  ]);
}

export function openItemPromptLines(health: OpenHealthLine[], items: PendingItemLine[]): string[] {
  return [
    ...health.map((event) => `- health (${event.kind}, since ${event.started_on}): ${event.title}`),
    ...items.map((item) => `- ${item.kind}${item.due_on ? ` (due ${item.due_on})` : ""}: ${item.text}`),
  ];
}

export function clipText(text: string | null, max: number): string | null {
  return text && text.length > max ? `${text.slice(0, max)}...` : text;
}

export function hasAnyField(fields: Record<string, unknown>): boolean {
  return Object.values(fields).some((value) => value !== undefined);
}

export function endsBeforeStart(start: string, end: string | null | undefined): boolean {
  return Boolean(end && end < start);
}
