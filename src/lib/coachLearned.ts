export type LearnedState =
  | { state: "pending" }
  | { state: "done"; facts: string[] };

export const LEARNING_STATE = JSON.stringify({ state: "pending" });

export function parseLearned(raw: string | null): LearnedState | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as LearnedState;
    if (parsed?.state === "pending") return { state: "pending" };
    if (parsed?.state !== "done") return undefined;
    const facts = Array.isArray(parsed.facts)
      ? parsed.facts.filter((fact): fact is string => typeof fact === "string")
      : [];
    return { state: "done", facts };
  } catch {
    return undefined;
  }
}

export function learnedState(facts: string[]): string {
  return JSON.stringify({ state: "done", facts });
}

export function settledLearned(
  learned: LearnedState | undefined,
): LearnedState | undefined {
  return learned?.state === "pending" ? undefined : learned;
}
