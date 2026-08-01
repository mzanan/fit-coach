"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { groqModels } from "@/lib/ai/groq";
import {
  AI_PROVIDERS,
  deleteAiSettings,
  getAiSettings,
  saveAiSettings,
  updateAiModel,
  userModelRef,
} from "@/lib/ai/providers";
import { getModelInfo, type ModelInfo } from "@/lib/ai/registry";
import { requireUser } from "@/lib/session";

export interface AiActionResult {
  error?: string;
}

const OPENROUTER_KEY_URL = "https://openrouter.ai/api/v1/key";
const FETCH_TIMEOUT_MS = 10_000;

const saveSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1),
});

async function openrouterKeyError(apiKey: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(OPENROUTER_KEY_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return "Could not reach OpenRouter to validate the key. Try again.";
  }
  if (response.status === 401 || response.status === 403) {
    return "OpenRouter rejected this API key.";
  }
  if (!response.ok) {
    return "Could not validate the key with OpenRouter. Try again.";
  }
  return null;
}

async function openrouterModelError(model: string): Promise<string | null> {
  try {
    const info = await getModelInfo(model);
    return info ? null : "Unknown model. Pick one from the list.";
  } catch {
    return "Could not load the model list from OpenRouter. Try again.";
  }
}

async function groqError(
  apiKey: string,
  model: string | null,
): Promise<string | null> {
  const result = await groqModels(apiKey);
  if (result.status === "unauthorized") return "Groq rejected this API key.";
  if (result.status === "error") {
    return "Could not reach Groq to validate the key. Try again.";
  }
  if (model && !result.models.some((entry) => entry.id === model)) {
    return "Unknown Groq model. Pick one from the list.";
  }
  return null;
}

function revalidateAi(): void {
  revalidatePath("/settings");
  revalidatePath("/settings/ai");
  revalidatePath("/settings/import");
  revalidatePath("/coach");
}

export async function listGroqModelsAction(
  input: unknown,
): Promise<{ models?: ModelInfo[]; error?: string }> {
  await requireUser();
  const parsed = z.string().trim().min(1).safeParse(input);
  if (!parsed.success) return { error: "Enter your Groq API key first." };

  const result = await groqModels(parsed.data);
  if (result.status === "unauthorized") {
    return { error: "Groq rejected this API key." };
  }
  if (result.status === "error") {
    return { error: "Could not load Groq's model list. Try again." };
  }
  return { models: result.models };
}

export async function saveAiSettingsAction(
  input: unknown,
): Promise<AiActionResult> {
  const user = await requireUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a key and pick a model." };
  const { provider, apiKey, model } = parsed.data;

  if (provider === "groq") {
    const error = await groqError(apiKey, model);
    if (error) return { error };
  } else {
    const invalidKey = await openrouterKeyError(apiKey);
    if (invalidKey) return { error: invalidKey };
    const invalidModel = await openrouterModelError(model);
    if (invalidModel) return { error: invalidModel };
  }

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

  if (existing.provider === "groq") {
    const ref = await userModelRef(user.id);
    if (!ref) {
      return { error: "Your stored key could not be read. Remove it and add it again." };
    }
    const error = await groqError(ref.apiKey, parsed.data);
    if (error) return { error };
  } else {
    const invalidModel = await openrouterModelError(parsed.data);
    if (invalidModel) return { error: invalidModel };
  }

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
