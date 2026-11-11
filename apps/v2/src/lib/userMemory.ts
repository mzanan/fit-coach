import { LOCATION_MAX, RULE_KEY_MAX } from "@/lib/constants";

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

export function locationSlug(value: string | null | undefined): string | null {
  if (!value) return null;
  return slug(value, /[^\p{L}\p{N}]+/gu).slice(0, LOCATION_MAX) || null;
}

export function cityKey(value: string): string {
  return value.replace(/_/g, "");
}

export function canonicalCity(location: string, cities: string[]): string {
  return cities.find((city) => cityKey(city) === cityKey(location)) ?? location;
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
