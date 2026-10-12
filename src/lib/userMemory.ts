import { FACT_SUBJECT_MAX } from "@/lib/constants";

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

export function factSubject(value: string | null | undefined): string | null {
  if (!value) return null;
  return slug(value, /[^\p{L}\p{N}]+/gu).slice(0, FACT_SUBJECT_MAX) || null;
}

export function factScope(value: string | null | undefined): string | null {
  if (!value) return null;
  return slug(value, /[^\p{L}\p{N}:]+/gu).replace(/_*:_*/g, ":") || null;
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
