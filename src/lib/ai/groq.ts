import "server-only";

const BASE_URL = process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1";
const MODEL = process.env.AI_MODEL ?? "llama-3.3-70b-versatile";
const VISION_BASE_URL =
  process.env.AI_VISION_BASE_URL ??
  "https://generativelanguage.googleapis.com/v1beta/openai";
const VISION_MODEL = process.env.AI_VISION_MODEL ?? "gemini-2.5-flash";
const EM_DASH = new RegExp("\\s*" + String.fromCharCode(0x2014) + "\\s*", "g");

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

function apiKey(): string | undefined {
  return process.env.AI_API_KEY ?? process.env.GROQ_API_KEY;
}

function visionApiKey(): string | undefined {
  if (process.env.AI_VISION_API_KEY) return process.env.AI_VISION_API_KEY;
  if (process.env.AI_VISION_BASE_URL === process.env.AI_BASE_URL) return apiKey();
  return undefined;
}

export function hasAi(): boolean {
  return Boolean(apiKey());
}

export function hasVisionAi(): boolean {
  return Boolean(visionApiKey());
}

function clean(text: string): string {
  return text.replace(EM_DASH, ", ").trim();
}

interface CompleteTarget {
  baseUrl: string;
  key: string | undefined;
  model: string;
}

function textTarget(): CompleteTarget {
  return { baseUrl: BASE_URL, key: apiKey(), model: MODEL };
}

function visionTarget(): CompleteTarget {
  return { baseUrl: VISION_BASE_URL, key: visionApiKey(), model: VISION_MODEL };
}

async function complete(
  messages: ChatMessage[],
  maxTokens: number,
  json: boolean,
  target: CompleteTarget = textTarget(),
  noReasoning = false,
): Promise<string> {
  const { baseUrl, key, model } = target;
  if (!key) throw new Error("AI_API_KEY not set");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      ...(noReasoning ? { reasoning_effort: "none" } : {}),
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

export async function chatJsonVision<T>(
  system: string,
  prompt: string,
  imageDataUrl: string,
  maxTokens = 2000,
): Promise<T> {
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    },
  ];
  return parseJson<T>(
    await complete(messages, maxTokens, true, visionTarget(), true),
  );
}

export async function chatJson<T>(
  messages: ChatMessage[],
  maxTokens = 4000,
): Promise<T> {
  return parseJson<T>(await complete(messages, maxTokens, true));
}

function parseJson<T>(raw: string): T {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI returned no JSON");
  return JSON.parse(stripped.slice(start, end + 1)) as T;
}
