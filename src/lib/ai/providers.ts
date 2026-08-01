import "server-only";

import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { and, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/integrations/crypto";

const { ai_credentials, profiles } = schema;

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

export interface AiCredential {
  provider: AiProvider;
  model: string;
}

export interface AiSetup {
  active: AiCredential | null;
  saved: AiCredential[];
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

function aad(userId: string, provider: AiProvider): string {
  return `${userId}:${provider}`;
}

async function activeProvider(userId: string): Promise<AiProvider | null> {
  const rows = await db
    .select({ ai_provider: profiles.ai_provider })
    .from(profiles)
    .where(eq(profiles.user_id, userId))
    .limit(1);
  const value = rows[0]?.ai_provider;
  return value && isAiProvider(value) ? value : null;
}

async function savedCredentials(userId: string): Promise<AiCredential[]> {
  const rows = await db
    .select({ provider: ai_credentials.provider, model: ai_credentials.model })
    .from(ai_credentials)
    .where(eq(ai_credentials.user_id, userId));
  return rows
    .filter((row): row is AiCredential => isAiProvider(row.provider))
    .sort((a, b) => a.provider.localeCompare(b.provider));
}

export async function getAiSetup(userId: string): Promise<AiSetup> {
  const [provider, saved] = await Promise.all([
    activeProvider(userId),
    savedCredentials(userId),
  ]);
  const active =
    saved.find((credential) => credential.provider === provider) ??
    saved[0] ??
    null;
  return { active, saved };
}

export async function getAiSettings(
  userId: string,
): Promise<AiCredential | null> {
  return (await getAiSetup(userId)).active;
}

export async function userModelRef(userId: string): Promise<ModelRef | null> {
  const active = await getAiSettings(userId);
  if (!active) return null;

  const rows = await db
    .select({ api_key_enc: ai_credentials.api_key_enc })
    .from(ai_credentials)
    .where(
      and(
        eq(ai_credentials.user_id, userId),
        eq(ai_credentials.provider, active.provider),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  try {
    return {
      provider: active.provider,
      model: active.model,
      apiKey: decryptSecret(row.api_key_enc, aad(userId, active.provider)),
    };
  } catch (err) {
    console.error("ai settings: stored key cannot be decrypted", err);
    return null;
  }
}

export async function providerApiKey(
  userId: string,
  provider: AiProvider,
): Promise<string | null> {
  const rows = await db
    .select({ api_key_enc: ai_credentials.api_key_enc })
    .from(ai_credentials)
    .where(
      and(
        eq(ai_credentials.user_id, userId),
        eq(ai_credentials.provider, provider),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  try {
    return decryptSecret(row.api_key_enc, aad(userId, provider));
  } catch (err) {
    console.error("ai settings: stored key cannot be decrypted", err);
    return null;
  }
}

async function setActive(
  userId: string,
  provider: AiProvider | null,
): Promise<void> {
  const result = await db
    .update(profiles)
    .set({ ai_provider: provider, updated_at: new Date() })
    .where(eq(profiles.user_id, userId));
  if (result.rowsAffected === 0) {
    throw new Error("Profile row missing, cannot set the active AI provider");
  }
}

export async function saveAiCredential(
  userId: string,
  provider: AiProvider,
  apiKey: string,
  model: string,
): Promise<void> {
  const now = new Date();
  const api_key_enc = encryptSecret(apiKey, aad(userId, provider));
  await db.transaction(async (tx) => {
    const result = await tx
      .update(profiles)
      .set({ ai_provider: provider, updated_at: now })
      .where(eq(profiles.user_id, userId));
    if (result.rowsAffected === 0) {
      throw new Error("Profile row missing, cannot save the AI credential");
    }
    await tx
      .insert(ai_credentials)
      .values({
        user_id: userId,
        provider,
        api_key_enc,
        model,
        created_at: now,
        updated_at: now,
      })
      .onConflictDoUpdate({
        target: [ai_credentials.user_id, ai_credentials.provider],
        set: { api_key_enc, model, updated_at: now },
      });
  });
}

export async function activateProvider(
  userId: string,
  provider: AiProvider,
): Promise<boolean> {
  const saved = await savedCredentials(userId);
  if (!saved.some((credential) => credential.provider === provider)) {
    return false;
  }
  await setActive(userId, provider);
  return true;
}

export async function updateAiModel(
  userId: string,
  provider: AiProvider,
  model: string,
): Promise<void> {
  await db
    .update(ai_credentials)
    .set({ model, updated_at: new Date() })
    .where(
      and(
        eq(ai_credentials.user_id, userId),
        eq(ai_credentials.provider, provider),
      ),
    );
}

export async function deleteAiCredential(
  userId: string,
  provider: AiProvider,
): Promise<void> {
  const wasActive = (await activeProvider(userId)) === provider;
  await db
    .delete(ai_credentials)
    .where(
      and(
        eq(ai_credentials.user_id, userId),
        eq(ai_credentials.provider, provider),
      ),
    );
  if (!wasActive) return;
  const remaining = await savedCredentials(userId);
  await setActive(userId, remaining[0]?.provider ?? null);
}
