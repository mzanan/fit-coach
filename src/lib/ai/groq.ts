import "server-only";

const BASE_URL = process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1";
const MODEL = process.env.AI_MODEL ?? "llama-3.3-70b-versatile";
const EM_DASH = new RegExp("\\s*" + String.fromCharCode(0x2014) + "\\s*", "g");

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function apiKey(): string | undefined {
  return process.env.AI_API_KEY ?? process.env.GROQ_API_KEY;
}

export function hasAi(): boolean {
  return Boolean(apiKey());
}

function clean(text: string): string {
  return text.replace(EM_DASH, ", ").trim();
}

async function complete(
  messages: ChatMessage[],
  maxTokens: number,
  json: boolean,
): Promise<string> {
  const key = apiKey();
  if (!key) throw new Error("AI_API_KEY not set");

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`ai ${res.status}`);

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function chat(
  messages: ChatMessage[],
  maxTokens = 600,
): Promise<string> {
  return clean(await complete(messages, maxTokens, false));
}

export async function chatJson<T>(
  messages: ChatMessage[],
  maxTokens = 4000,
): Promise<T> {
  const raw = await complete(messages, maxTokens, true);
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI returned no JSON");
  return JSON.parse(stripped.slice(start, end + 1)) as T;
}
