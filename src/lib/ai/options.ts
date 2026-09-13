export const AI_PROVIDERS = ["openrouter", "groq", "google", "explabs"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const REASONING_EFFORTS = ["none", "low", "medium", "high"] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export function isAiProvider(value: string): value is AiProvider {
  return (AI_PROVIDERS as readonly string[]).includes(value);
}

export const KEYED_PROVIDERS = ["groq", "google", "explabs"] as const;
export type KeyedProvider = (typeof KEYED_PROVIDERS)[number];

export function isKeyedProvider(provider: AiProvider): provider is KeyedProvider {
  return (KEYED_PROVIDERS as readonly string[]).includes(provider);
}

export function isReasoningEffort(value: string): value is ReasoningEffort {
  return (REASONING_EFFORTS as readonly string[]).includes(value);
}

export const PROVIDER_LABEL: Record<AiProvider, string> = {
  openrouter: "OpenRouter",
  groq: "Groq",
  google: "Google",
  explabs: "Experiential Labs",
};
