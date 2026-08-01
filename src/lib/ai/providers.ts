import "server-only";

import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/integrations/crypto";

const { ai_settings } = schema;

export const AI_PROVIDERS = ["openrouter", "groq"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export function isAiProvider(value: string): value is AiProvider {
  return (AI_PROVIDERS as readonly string[]).includes(value);
}

export interface ModelRef {
  provider: AiProvider;
  model: string;
  apiKey: string;
  routeOnly?: string[];
}

export function resolveModel(ref: ModelRef): LanguageModel {
  if (ref.provider === "groq") {
    return createGroq({ apiKey: ref.apiKey })(ref.model);
  }
  return createOpenRouter({ apiKey: ref.apiKey })(
    ref.model,
    ref.routeOnly?.length ? { provider: { only: ref.routeOnly } } : {},
  );
}

function aad(userId: string): string {
  return `${userId}:openrouter`;
}

export interface AiSettings {
  provider: AiProvider;
  model: string;
}

function toProvider(value: string): AiProvider {
  return isAiProvider(value) ? value : "openrouter";
}

export async function getAiSettings(
  userId: string,
): Promise<AiSettings | null> {
  const rows = await db
    .select({ provider: ai_settings.provider, model: ai_settings.model })
    .from(ai_settings)
    .where(eq(ai_settings.user_id, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { provider: toProvider(row.provider), model: row.model };
}

export async function userModelRef(userId: string): Promise<ModelRef | null> {
  const rows = await db
    .select({
      provider: ai_settings.provider,
      model: ai_settings.model,
      api_key_enc: ai_settings.api_key_enc,
    })
    .from(ai_settings)
    .where(eq(ai_settings.user_id, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  try {
    return {
      provider: toProvider(row.provider),
      model: row.model,
      apiKey: decryptSecret(row.api_key_enc, aad(userId)),
    };
  } catch (err) {
    console.error("ai settings: stored key cannot be decrypted", err);
    return null;
  }
}

export async function saveAiSettings(
  userId: string,
  provider: AiProvider,
  apiKey: string,
  model: string,
): Promise<void> {
  const now = new Date();
  await db
    .insert(ai_settings)
    .values({
      user_id: userId,
      provider,
      api_key_enc: encryptSecret(apiKey, aad(userId)),
      model,
      created_at: now,
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: ai_settings.user_id,
      set: {
        provider,
        api_key_enc: encryptSecret(apiKey, aad(userId)),
        model,
        updated_at: now,
      },
    });
}

export async function updateAiModel(
  userId: string,
  model: string,
): Promise<void> {
  await db
    .update(ai_settings)
    .set({ model, updated_at: new Date() })
    .where(eq(ai_settings.user_id, userId));
}

export async function deleteAiSettings(userId: string): Promise<void> {
  await db.delete(ai_settings).where(eq(ai_settings.user_id, userId));
}
