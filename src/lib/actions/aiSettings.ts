"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  deleteAiSettings,
  getAiSettings,
  saveAiSettings,
  updateAiModel,
} from "@/lib/ai/providers";
import { getModelInfo } from "@/lib/ai/registry";
import { requireUser } from "@/lib/session";

export interface AiActionResult {
  error?: string;
}

const saveSchema = z.object({
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1),
});

async function keyError(apiKey: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
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

async function modelError(model: string): Promise<string | null> {
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

export async function saveAiSettingsAction(
  input: unknown,
): Promise<AiActionResult> {
  const user = await requireUser();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a key and pick a model." };
  const { apiKey, model } = parsed.data;

  const invalidKey = await keyError(apiKey);
  if (invalidKey) return { error: invalidKey };
  const invalidModel = await modelError(model);
  if (invalidModel) return { error: invalidModel };

  await saveAiSettings(user.id, apiKey, model);
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
  const invalidModel = await modelError(parsed.data);
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
