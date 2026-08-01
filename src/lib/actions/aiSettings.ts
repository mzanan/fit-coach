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

const saveSchema = z.object({
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1),
});

async function validateKey(apiKey: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("Could not reach OpenRouter to validate the key. Try again.");
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error("OpenRouter rejected this API key.");
  }
  if (!response.ok) {
    throw new Error("Could not validate the key with OpenRouter. Try again.");
  }
}

async function validateModel(model: string): Promise<void> {
  const info = await getModelInfo(model);
  if (!info) throw new Error("Unknown model. Pick one from the list.");
}

function revalidateAi(): void {
  revalidatePath("/settings");
  revalidatePath("/settings/ai");
  revalidatePath("/settings/import");
  revalidatePath("/coach");
}

export async function saveAiSettingsAction(input: unknown) {
  const user = await requireUser();
  const { apiKey, model } = saveSchema.parse(input);
  await validateKey(apiKey);
  await validateModel(model);
  await saveAiSettings(user.id, apiKey, model);
  revalidateAi();
}

export async function updateAiModelAction(input: unknown) {
  const user = await requireUser();
  const model = z.string().trim().min(1).parse(input);
  const existing = await getAiSettings(user.id);
  if (!existing) throw new Error("Save your API key first.");
  await validateModel(model);
  await updateAiModel(user.id, model);
  revalidateAi();
}

export async function removeAiSettingsAction() {
  const user = await requireUser();
  await deleteAiSettings(user.id);
  revalidateAi();
}
