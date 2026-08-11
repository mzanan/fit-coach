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

export const PROGRESSION_SESSIONS_REQUIRED = 2;

export interface SessionCleanliness {
  day: string;
  clean: boolean;
  firstReps: number | null;
  lastReps: number | null;
  hasUnloggedSet: boolean;
}

export function sessionCleanliness(
  day: string,
  sets: HistorySet[],
): SessionCleanliness {
  if (sets.length === 0) {
    return {
      day,
      clean: false,
      firstReps: null,
      lastReps: null,
      hasUnloggedSet: false,
    };
  }
  const hasUnloggedSet = sets.some((s) => s.reps == null);
  const firstReps = sets[0].reps;
  const lastReps = sets[sets.length - 1].reps;
  const droppedReps =
    firstReps != null && lastReps != null && lastReps < firstReps;
  const clean = !hasUnloggedSet && !droppedReps;
  return { day, clean, firstReps, lastReps, hasUnloggedSet };
}

export interface ProgressionEligibility {
  eligible: boolean;
  reason: string;
  sessions: SessionCleanliness[];
}

export function evaluateProgression(
  sessions: { day: string; sets: HistorySet[] }[],
): ProgressionEligibility {
  if (sessions.length < PROGRESSION_SESSIONS_REQUIRED) {
    return {
      eligible: false,
      reason: `Only ${sessions.length} logged session(s) found for this exercise, need ${PROGRESSION_SESSIONS_REQUIRED} clean ones before raising the weight.`,
      sessions: sessions.map((s) => sessionCleanliness(s.day, s.sets)),
    };
  }
  const checked = sessions
    .slice(0, PROGRESSION_SESSIONS_REQUIRED)
    .map((s) => sessionCleanliness(s.day, s.sets));
  const failed = checked.find((c) => !c.clean);
  if (failed) {
    const detail = failed.hasUnloggedSet
      ? "at least one set has no reps logged"
      : `reps dropped from ${failed.firstReps ?? "?"} on the first set to ${failed.lastReps ?? "?"} on the last`;
    return {
      eligible: false,
      reason: `Session on ${failed.day} was not clean: ${detail}, so it does not count.`,
      sessions: checked,
    };
  }
  return {
    eligible: true,
    reason: `Last ${PROGRESSION_SESSIONS_REQUIRED} sessions (${checked.map((c) => c.day).join(", ")}) held or increased reps across every set. Eligible to raise the weight.`,
    sessions: checked,
  };
}
