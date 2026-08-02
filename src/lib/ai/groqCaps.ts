export interface GroqCapability {
  tools: boolean;
  structured: boolean;
  reasoning: boolean;
}

const NON_CHAT = /whisper|tts|guard|embedding/i;

export const GROQ_CAPABILITIES: Record<string, GroqCapability> = {
  "openai/gpt-oss-120b": { tools: true, structured: true, reasoning: true },
  "openai/gpt-oss-20b": { tools: true, structured: true, reasoning: true },
  "llama-3.3-70b-versatile": {
    tools: true,
    structured: false,
    reasoning: false,
  },
};

export function isGroqChatModel(id: string): boolean {
  return !NON_CHAT.test(id);
}

export function groqCapability(id: string): GroqCapability {
  return (
    GROQ_CAPABILITIES[id] ?? { tools: false, structured: false, reasoning: false }
  );
}
