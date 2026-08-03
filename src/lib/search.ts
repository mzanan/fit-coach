export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function matchesTerm(haystack: string, term: string): boolean {
  const target = normalizeSearch(haystack);
  const needle = normalizeSearch(term);
  if (!needle) return false;
  if (target.includes(needle)) return true;
  const tokens = needle.split(/\s+/).filter(Boolean);
  return tokens.length > 1 && tokens.every((token) => target.includes(token));
}
