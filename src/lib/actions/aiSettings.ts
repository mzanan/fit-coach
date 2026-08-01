"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { groqCapability } from "@/lib/ai/groqCaps";
import {
  AI_PROVIDERS,
  deleteAiSettings,
  getAiSettings,
  saveAiSettings,
  updateAiModel,
  userModelRef,
  type AiProvider,
} from "@/lib/ai/providers";
import { getModelInfo } from "@/lib/ai/registry";
import { requireUser } from "@/lib/session";

export interface AiActionResult {
  error?: string;
}

export interface GroqModelInfo {
  id: string;
  tools: boolean;
  structured: boolean;
}

const saveSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1),
});

async function fetchGroqModels(apiKey: string): Promise<string[] | null> {
  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const body = (await response.json()) as { data?: { id: string }[] };
  return (body.data ?? []).map((model) => model.id);
}

async function keyError(
  provider: AiProvider,
  apiKey: string,
): Promise<string | null> {
  const url =
    provider === "groq"
      ? "https://api.groq.com/openai/v1/models"
      : "https://openrouter.ai/api/v1/key";
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return "Could not reach the provider to validate the key. Try again.";
  }
  if (response.status === 401 || response.status === 403) {
    return `${provider === "groq" ? "Groq" : "OpenRouter"} rejected this API key.`;
  }
  if (!response.ok) {
    return "Could not validate the key with the provider. Try again.";
  }
  return null;
}

async function modelError(
  provider: AiProvider,
  model: string,
  apiKey?: string,
): Promise<string | null> {
  if (provider === "groq") {
    if (!apiKey) return "Save your API key first.";
    const models = await fetchGroqModels(apiKey);
    if (!models) return "Could not load Groq's model list. Try again.";
    return models.includes(model)
      ? null
      : "Unknown Groq model. Pick one from the list.";
  }
  try {
    const info = await getModelInfo(model);
    return info ? null : "Unknown model. Pick one from the list.";
  } catch {
    return "Could not load the model list from OpenRouter. Try again.";
  }
}

function revalidateAi(): void {
  revalidatePath("/settings");
  revalidatePath("/settings/ai");
  revalidatePath("/settings/import");
  revalidatePath("/coach");
}

export async function listGroqModelsAction(
  input: unknown,
): Promise<{ models?: GroqModelInfo[]; error?: string }> {
  await requireUser();
  const parsed = z.string().trim().min(1).safeParse(input);
  if (!parsed.success) return { error: "Enter your Groq API key first." };

  const invalidKey = await keyError("groq", parsed.data);
  if (invalidKey) return { error: invalidKey };
  const models = await fetchGroqModels(parsed.data);
  if (!models) return { error: "Could not load Groq's model list. Try again." };

  return {
    models: models.sort().map((id) => ({ id, ...groqCapability(id) })),
  };
}

export async function saveAiSettingsAction(
  input: unknown,
): Promise<AiActionResult> {
  const user = await requireUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a key and pick a model." };
  const { provider, apiKey, model } = parsed.data;

  const invalidKey = await keyError(provider, apiKey);
  if (invalidKey) return { error: invalidKey };
  const invalidModel = await modelError(provider, model, apiKey);
  if (invalidModel) return { error: invalidModel };

  await saveAiSettings(user.id, provider, apiKey, model);
  revalidateAi();
  return {};
}

export async function updateAiModelAction(
  input: unknown,
): Promise<AiActionResult> {
  const user = await requireUser();
  const parsed = z.string().trim().min(1).safeParse(input);
  if (!parsed.success) return { error: "Pick a model from the list." };

  const existing = await getAiSettings(user.id);
  if (!existing) return { error: "Save your API key first." };

  const ref = await userModelRef(user.id);
  const invalidModel = await modelError(
    existing.provider,
    parsed.data,
    ref?.apiKey,
  );
  if (invalidModel) return { error: invalidModel };

  await updateAiModel(user.id, parsed.data);
  revalidateAi();
  return {};
}

export async function removeAiSettingsAction(): Promise<AiActionResult> {
  const user = await requireUser();
  await deleteAiSettings(user.id);
  revalidateAi();
  return {};
}
