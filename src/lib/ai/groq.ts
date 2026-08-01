import "server-only";

import { groqCapability, isGroqChatModel } from "@/lib/ai/groqCaps";
import type { ModelInfo } from "@/lib/ai/registry";

const GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";
const FETCH_TIMEOUT_MS = 10_000;

export type GroqModelsResult =
  | { status: "ok"; models: ModelInfo[] }
  | { status: "unauthorized" }
  | { status: "error" };

export async function groqModels(apiKey: string): Promise<GroqModelsResult> {
  try {
    const response = await fetch(GROQ_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (response.status === 401 || response.status === 403) {
      return { status: "unauthorized" };
    }
    if (!response.ok) return { status: "error" };

    const body = (await response.json()) as { data?: { id?: string }[] };
    const models = (body.data ?? [])
      .map((model) => model.id)
      .filter((id): id is string => Boolean(id) && isGroqChatModel(id ?? ""))
      .sort()
      .map((id) => ({ id, name: id, free: false, ...groqCapability(id) }));
    return { status: "ok", models };
  } catch {
    return { status: "error" };
  }
}
