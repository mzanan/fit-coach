import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/integrations/crypto";

const { ai_settings } = schema;

export interface ModelRef {
  model: string;
  apiKey: string;
  routeOnly?: string[];
}

export function resolveModel(ref: ModelRef): LanguageModel {
  return createOpenRouter({ apiKey: ref.apiKey })(
    ref.model,
    ref.routeOnly?.length ? { provider: { only: ref.routeOnly } } : {},
  );
}

function aad(userId: string): string {
  return `${userId}:openrouter`;
}

export async function getAiSettings(
  userId: string,
): Promise<{ model: string } | null> {
  const rows = await db
    .select({ model: ai_settings.model })
    .from(ai_settings)
    .where(eq(ai_settings.user_id, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function userModelRef(userId: string): Promise<ModelRef | null> {
  const rows = await db
    .select({ model: ai_settings.model, api_key_enc: ai_settings.api_key_enc })
    .from(ai_settings)
    .where(eq(ai_settings.user_id, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { model: row.model, apiKey: decryptSecret(row.api_key_enc, aad(userId)) };
}

export async function saveAiSettings(
  userId: string,
  apiKey: string,
  model: string,
): Promise<void> {
  const now = new Date();
  await db
    .insert(ai_settings)
    .values({
      user_id: userId,
      api_key_enc: encryptSecret(apiKey, aad(userId)),
      model,
      created_at: now,
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: ai_settings.user_id,
      set: {
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
