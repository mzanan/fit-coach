import "server-only";

import type { ModelRef } from "@/lib/ai/aiCredentials";
import { chatJson } from "@/lib/ai/provider";
import { getCatalog } from "@/lib/data/catalog";
import { normalizeSearch } from "@/lib/search";

const EXTRACT_SYSTEM = `You read one message a nutrition coach sent to a user and list the foods it names as something for the user to eat.

Rules:
- Copy each food verbatim from the message, in the message's own language. Never translate, never rephrase, never invent.
- One entry per food or dish. A dish named as a whole ("Pollo Avo", "bun cha") is one entry, do not split it into ingredients the message did not name separately.
- Include only foods presented as something to eat or order: a suggestion, a plan, an addition, a replacement.
- Exclude foods the message says the user already ate or logged, foods it says it could not find, macro names (protein, carbs, fat), meal names (breakfast, lunch, dinner), and places or restaurants.
- If the message names no food to eat, return an empty array.

Return JSON: {"foods":["...","..."]}`;

const MAX_FOODS = 12;
const MAX_FOOD_LENGTH = 60;
const MIN_TOKEN_LENGTH = 2;
const MIN_STEM_LENGTH = 4;

function foodTokens(value: string): string[] {
  return normalizeSearch(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);
}

function sameToken(a: string, b: string): boolean {
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= MIN_STEM_LENGTH && longer.startsWith(shorter);
}

function contains(haystack: string[], needles: string[]): boolean {
  return needles.every((needle) =>
    haystack.some((token) => sameToken(token, needle)),
  );
}

function covers(term: string[], food: string[]): boolean {
  if (!term.length || !food.length) return false;
  return contains(term, food) || contains(food, term);
}

export function unlistedFoods(
  named: string[],
  catalogTerms: string[],
): string[] {
  const terms = catalogTerms.map(foodTokens).filter((tokens) => tokens.length);
  const seen = new Set<string>();
  const unlisted: string[] = [];
  for (const food of named) {
    const trimmed = food.trim();
    if (!trimmed || trimmed.length > MAX_FOOD_LENGTH) continue;
    const key = normalizeSearch(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const tokens = foodTokens(trimmed);
    if (!tokens.length) continue;
    if (!terms.some((term) => covers(term, tokens))) unlisted.push(trimmed);
  }
  return unlisted;
}

async function catalogTerms(userId: string): Promise<string[]> {
  const items = await getCatalog(userId);
  return items.flatMap((item) => [
    item.name,
    ...item.components.map((component) => component.name),
  ]);
}

async function namedFoods(ref: ModelRef, text: string): Promise<string[]> {
  const { foods } = await chatJson<{ foods?: unknown }>(
    ref,
    [
      { role: "system", content: EXTRACT_SYSTEM },
      { role: "user", content: text },
    ],
    600,
  );
  if (!Array.isArray(foods)) return [];
  return foods
    .filter((food): food is string => typeof food === "string")
    .slice(0, MAX_FOODS);
}

function disclosure(foods: string[]): string {
  return `\n\n(Not in your catalog: ${foods.join(", ")}. Those macros are estimates, not your saved items. Ask me to add them if you want them saved.)`;
}

export async function offCatalogWarning(
  ref: ModelRef,
  userId: string,
  text: string,
  searchedCatalog: boolean,
): Promise<string> {
  if (!searchedCatalog || !text.trim()) return "";
  try {
    const terms = await catalogTerms(userId);
    if (!terms.length) return "";
    const unlisted = unlistedFoods(await namedFoods(ref, text), terms);
    if (!unlisted.length) return "";
    console.info(
      `coach: suggestion named ${unlisted.length} food(s) outside the catalog: ${unlisted.join(", ")}`,
    );
    return disclosure(unlisted);
  } catch (err) {
    console.error(
      "coach: off-catalog check failed",
      err instanceof Error ? err.message : err,
    );
    return "";
  }
}
