import "server-only";

import { unstable_cache } from "next/cache";

const OPENROUTER_API = "https://openrouter.ai/api/v1";
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_SECONDS = 3600;

export interface ModelInfo {
  id: string;
  name: string;
  tools: boolean;
  structured: boolean;
  free: boolean;
}

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

export const structuredRouteOnly = unstable_cache(
  async (model: string): Promise<string[] | null> =>
    endpointsWithParameter(await fetchEndpoints(model), "structured_outputs"),
  ["openrouter-endpoints"],
  { revalidate: CACHE_SECONDS },
);

export const toolsRouteOnly = unstable_cache(
  async (model: string): Promise<string[] | null> =>
    endpointsWithParameter(await fetchEndpoints(model), "tools"),
  ["openrouter-endpoints-tools"],
  { revalidate: CACHE_SECONDS },
);

export async function canStructured(model: string): Promise<boolean> {
  return (await structuredRouteOnly(model)) !== null;
}
