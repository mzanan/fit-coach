export const AI_PROVIDERS = ["openrouter", "groq", "google"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const REASONING_EFFORTS = ["none", "low", "medium", "high"] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export function isAiProvider(value: string): value is AiProvider {
  return (AI_PROVIDERS as readonly string[]).includes(value);
}

export function isReasoningEffort(value: string): value is ReasoningEffort {
  return (REASONING_EFFORTS as readonly string[]).includes(value);
}

export const PROVIDER_LABEL: Record<AiProvider, string> = {
  openrouter: "OpenRouter",
  groq: "Groq",
  google: "Google",
};
