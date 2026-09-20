export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function tokenHits(haystack: string, term: string): { hits: number; total: number } | null {
  const target = normalizeSearch(haystack);
  const needle = normalizeSearch(term);
  if (!needle) return null;
  if (target.includes(needle)) return { hits: 1, total: 1 };
  const tokens = needle.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return { hits: 0, total: tokens.length };
  return {
    hits: tokens.filter((token) => target.includes(token)).length,
    total: tokens.length,
  };
}

export function matchesAllTerms(haystack: string, term: string): boolean {
  const counted = tokenHits(haystack, term);
  return counted !== null && counted.total > 0 && counted.hits === counted.total;
}

export function matchesTerm(haystack: string, term: string): boolean {
  const counted = tokenHits(haystack, term);
  if (!counted || !counted.total) return false;
  if (counted.total === 1) return counted.hits === 1;
  return counted.hits >= Math.max(2, Math.ceil(counted.total / 2));
}
