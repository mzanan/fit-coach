import "server-only";

const REQUIRED = [
  "AI_VISION_API_KEY",
  "AI_VISION_BASE_URL",
  "AI_VISION_MODEL",
] as const;

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface VisionMessage {
  role: "system" | "user";
  content: string | ContentPart[];
}

function missing(): string[] {
  return REQUIRED.filter((name) => !process.env[name]);
}

function config(): { key: string; baseUrl: string; model: string } {
  const absent = missing();
  if (absent.length) throw new Error(`${absent.join(", ")} not set`);
  return {
    key: process.env.AI_VISION_API_KEY!,
    baseUrl: process.env.AI_VISION_BASE_URL!,
    model: process.env.AI_VISION_MODEL!,
  };
}

export function hasVisionAi(): boolean {
  return missing().length === 0;
}

export async function chatJsonVision<T>(
  system: string,
  prompt: string,
  imageDataUrl: string,
  maxTokens = 2000,
): Promise<T> {
  const { key, baseUrl, model } = config();

  const messages: VisionMessage[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    },
  ];

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
      response_format: { type: "json_object" },
      reasoning_effort: "none",
    }),
  });
  if (!res.ok) throw new Error(`ai ${res.status}`);

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return parseJson<T>(data.choices?.[0]?.message?.content ?? "");
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
