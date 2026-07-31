import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

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

function parseRouteOnly(raw: string | undefined): string[] | undefined {
  const entries = (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length ? entries : undefined;
}

export function systemModelRef(): ModelRef | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.AI_MODEL;
  if (!apiKey || !model) return null;

  return {
    model,
    apiKey,
    routeOnly: parseRouteOnly(process.env.AI_ROUTE_ONLY),
  };
}
