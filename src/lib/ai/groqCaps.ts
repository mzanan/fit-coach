export interface GroqCapability {
  tools: boolean;
  structured: boolean;
}

export const GROQ_CAPABILITIES: Record<string, GroqCapability> = {
  "openai/gpt-oss-120b": { tools: true, structured: true },
  "openai/gpt-oss-20b": { tools: true, structured: true },
  "llama-3.3-70b-versatile": { tools: true, structured: false },
};

export function groqCapability(model: string): GroqCapability {
  return GROQ_CAPABILITIES[model] ?? { tools: false, structured: false };
}
