import "server-only";

const BASE_URL = process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1";
const MODEL = process.env.AI_MODEL ?? "llama-3.3-70b-versatile";
const EM_DASH = new RegExp("\\s*" + String.fromCharCode(0x2014) + "\\s*", "g");

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function hasAi(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

function clean(text: string): string {
  return text.replace(EM_DASH, ", ").trim();
}

export async function chat(
  messages: ChatMessage[],
  maxTokens = 600,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages }),
  });
  if (!res.ok) throw new Error(`groq ${res.status}`);

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return clean(data.choices?.[0]?.message?.content ?? "");
}
