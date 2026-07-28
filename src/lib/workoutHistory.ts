export interface HistorySet {
  reps: number | null;
  weight: number | null;
  per_side: boolean;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function topSet(sets: HistorySet[]): HistorySet | null {
  if (sets.length === 0) return null;
  return [...sets].sort((a, b) => {
    if (a.weight == null && b.weight == null) {
      return (b.reps ?? 0) - (a.reps ?? 0);
    }
    if (a.weight == null) return 1;
    if (b.weight == null) return -1;
    if (a.weight !== b.weight) return b.weight - a.weight;
    return (b.reps ?? 0) - (a.reps ?? 0);
  })[0];
}

export function formatSet(set: HistorySet | null): string {
  if (!set) return "--";
  const weight = set.weight == null ? "BW" : `${round2(set.weight)} kg`;
  const suffix = set.per_side ? "/side" : "";
  return `${set.reps ?? "-"} x ${weight}${suffix}`;
}

export function formatSetLine(sets: HistorySet[]): string {
  if (sets.length === 0) return "--";
  const uniform = sets.every(
    (s) =>
      s.reps === sets[0].reps &&
      s.weight === sets[0].weight &&
      s.per_side === sets[0].per_side,
  );
  if (uniform) {
    const weight = sets[0].weight == null ? "BW" : `${round2(sets[0].weight)} kg`;
    const suffix = sets[0].per_side ? "/side" : "";
    return `${sets.length} x ${sets[0].reps ?? "-"} x ${weight}${suffix}`;
  }
  const shown = sets.slice(0, 3).map((s) => {
    const weight = s.weight == null ? "BW" : `${round2(s.weight)}`;
    const suffix = s.per_side ? "/side" : "";
    return `${s.reps ?? "-"} x ${weight}${suffix}`;
  });
  const rest = sets.length - shown.length;
  return shown.join(", ") + (rest > 0 ? ` +${rest}` : "");
}

export function beatsLast(
  current: HistorySet | null,
  top: HistorySet | null,
): number | null {
  if (!current || !top) return null;
  if (current.per_side !== top.per_side) return null;
  if (current.weight != null && top.weight != null) {
    return round2(current.weight - top.weight);
  }
  if (current.weight == null && top.weight == null) {
    return (current.reps ?? 0) - (top.reps ?? 0);
  }
  return null;
}
