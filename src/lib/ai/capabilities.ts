import "server-only";

import { unstable_cache } from "next/cache";

import type { AiProvider } from "@/lib/ai/options";
import { FETCH_TIMEOUT_MS } from "@/lib/constants";

const OPENROUTER_API = "https://openrouter.ai/api/v1";
const GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";
const GOOGLE_MODELS_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const CACHE_SECONDS = 3600;

export interface ModelInfo {
  id: string;
  name: string;
  tools: boolean;
  structured: boolean;
  free: boolean;
}

export type ProviderModelsResult =
  | { status: "ok"; models: ModelInfo[] }
  | { status: "unauthorized" }
  | { status: "error" };

// -- OpenRouter catalogue -----------------------------------------------

interface CatalogModel {
  id: string;
  name?: string;
  supported_parameters?: string[];
  pricing?: { prompt?: string; completion?: string };
}

interface ModelEndpoint {
  tag?: string;
  provider_name?: string;
  supported_parameters?: string[];
  pricing?: { prompt?: string; completion?: string };
}

function isFree(pricing?: { prompt?: string; completion?: string }): boolean {
  return Number(pricing?.prompt ?? 1) === 0 && Number(pricing?.completion ?? 1) === 0;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`OpenRouter ${response.status} on ${url}`);
  return (await response.json()) as T;
}

export const listModels = unstable_cache(
  async (): Promise<ModelInfo[]> => {
    const body = await fetchJson<{ data: CatalogModel[] }>(
      `${OPENROUTER_API}/models`,
    );
    return body.data
      .map((model) => ({
        id: model.id,
        name: model.name ?? model.id,
        tools: (model.supported_parameters ?? []).includes("tools"),
        structured: (model.supported_parameters ?? []).includes(
          "structured_outputs",
        ),
        free: isFree(model.pricing),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  ["openrouter-models"],
  { revalidate: CACHE_SECONDS },
);

export async function getModelInfo(model: string): Promise<ModelInfo | null> {
  const models = await listModels();
  return models.find((m) => m.id === model) ?? null;
}

function providerTag(endpoint: ModelEndpoint): string | null {
  if (endpoint.tag) return endpoint.tag;
  if (endpoint.provider_name) {
    return endpoint.provider_name.toLowerCase().replace(/\s+/g, "-");
  }
  return null;
}

async function fetchEndpoints(model: string): Promise<ModelEndpoint[]> {
  const path = model
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const body = await fetchJson<{ data?: { endpoints?: ModelEndpoint[] } }>(
    `${OPENROUTER_API}/models/${path}/endpoints`,
  );
  return body.data?.endpoints ?? [];
}

function endpointsWithParameter(
  endpoints: ModelEndpoint[],
  parameter: string,
): string[] | null {
  const tags = endpoints
    .filter((endpoint) =>
      (endpoint.supported_parameters ?? []).includes(parameter),
    )
    .map(providerTag)
    .filter((tag): tag is string => Boolean(tag));
  return tags.length ? tags : null;
}

const structuredRouteOnly = unstable_cache(
  async (model: string): Promise<string[] | null> =>
    endpointsWithParameter(await fetchEndpoints(model), "structured_outputs"),
  ["openrouter-endpoints"],
  { revalidate: CACHE_SECONDS },
);

const toolsRouteOnly = unstable_cache(
  async (model: string): Promise<string[] | null> =>
    endpointsWithParameter(await fetchEndpoints(model), "tools"),
  ["openrouter-endpoints-tools"],
  { revalidate: CACHE_SECONDS },
);

// -- Groq curated capability map -----------------------------------------
// Groq's own /models endpoint does not declare tool/JSON-schema support per
// model, so this stays hand-maintained and every live-fetched id is looked
// up against it (unknown ids default to no capability, never a guess).

interface GroqCapability {
  tools: boolean;
  structured: boolean;
  reasoning: boolean;
}

const NON_CHAT = /whisper|tts|guard|embedding/i;

const GROQ_CAPABILITIES: Record<string, GroqCapability> = {
  "openai/gpt-oss-120b": { tools: true, structured: true, reasoning: true },
  "openai/gpt-oss-20b": { tools: true, structured: true, reasoning: true },
  "llama-3.3-70b-versatile": {
    tools: true,
    structured: false,
    reasoning: false,
  },
};

function isGroqChatModel(id: string): boolean {
  return !NON_CHAT.test(id);
}

export function groqCapability(id: string): GroqCapability {
  return (
    GROQ_CAPABILITIES[id] ?? { tools: false, structured: false, reasoning: false }
  );
}

export async function groqModels(apiKey: string): Promise<ProviderModelsResult> {
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

// -- Google curated capability map ---------------------------------------
// Same reasoning as Groq above: Google's /v1beta/models endpoint reports
// generation methods, not tool/JSON-schema support, so capability stays
// curated and any live-fetched id not in this map is listed but marked
// unsupported rather than guessed at.

export interface GoogleModel {
  id: string;
  name: string;
  maxInputChars: number;
  freeTier: boolean;
}

export const GOOGLE_MODELS: GoogleModel[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    maxInputChars: 120_000,
    freeTier: true,
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    maxInputChars: 120_000,
    freeTier: true,
  },
];

export function googleModel(id: string): GoogleModel | null {
  return GOOGLE_MODELS.find((model) => model.id === id) ?? null;
}

interface GoogleApiModel {
  name?: string;
  supportedGenerationMethods?: string[];
}

export async function googleModels(
  apiKey: string,
): Promise<ProviderModelsResult> {
  try {
    const response = await fetch(
      `${GOOGLE_MODELS_URL}?key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (response.status === 400 || response.status === 403) {
      return { status: "unauthorized" };
    }
    if (!response.ok) return { status: "error" };

    const body = (await response.json()) as { models?: GoogleApiModel[] };
    const models = (body.models ?? [])
      .filter((model) =>
        (model.supportedGenerationMethods ?? []).includes("generateContent"),
      )
      .map((model) => model.name?.replace(/^models\//, ""))
      .filter((id): id is string => Boolean(id))
      .sort()
      .map((id) => {
        const known = googleModel(id);
        return {
          id,
          name: known?.name ?? id,
          tools: Boolean(known),
          structured: Boolean(known),
          free: known?.freeTier ?? false,
        };
      });
    return { status: "ok", models };
  } catch {
    return { status: "error" };
  }
}

// -- Capability routing, keyed by provider + model -----------------------

export async function structuredRouting(
  provider: AiProvider,
  model: string,
): Promise<string[] | null | undefined> {
  if (provider === "google") {
    return googleModel(model) ? undefined : null;
  }
  if (provider === "groq") {
    return groqCapability(model).structured ? undefined : null;
  }
  return structuredRouteOnly(model);
}

export async function toolsRouting(
  provider: AiProvider,
  model: string,
): Promise<string[] | null | undefined> {
  if (provider === "google") {
    return googleModel(model) ? undefined : null;
  }
  if (provider === "groq") {
    return groqCapability(model).tools ? undefined : null;
  }
  return toolsRouteOnly(model);
}

export async function canStructured(
  provider: AiProvider,
  model: string,
): Promise<boolean> {
  return (await structuredRouting(provider, model)) !== null;
}

export async function canTools(
  provider: AiProvider,
  model: string,
): Promise<boolean> {
  return (await toolsRouting(provider, model)) !== null;
}
