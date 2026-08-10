import "server-only";

import { EMBEDDING_DIM } from "@/lib/constants";

const BASE_URL =
  process.env.AI_EMBEDDING_BASE_URL ??
  "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.AI_EMBEDDING_MODEL ?? "gemini-embedding-001";

function apiKey(): string | undefined {
  return process.env.AI_EMBEDDING_API_KEY ?? process.env.AI_VISION_API_KEY;
}

export function hasEmbeddings(): boolean {
  return Boolean(apiKey());
}

export function embeddingModelTag(): string {
  return `${MODEL}/${EMBEDDING_DIM}`;
}

export async function embed(text: string): Promise<number[]> {
  const key = apiKey();
  if (!key) throw new Error("AI_EMBEDDING_API_KEY not set");

  const res = await fetch(
    `${BASE_URL}/models/${MODEL}:embedContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIM,
      }),
    },
  );
  if (!res.ok) throw new Error(`embedding ${res.status}`);

  const data = (await res.json()) as { embedding?: { values?: number[] } };
  const values = data.embedding?.values;
  if (!values?.length) throw new Error("embedding response had no values");
  if (values.length !== EMBEDDING_DIM) {
    throw new Error(
      `embedding dimension ${values.length} does not match column F32_BLOB(${EMBEDDING_DIM})`,
    );
  }
  return normalize(values);
}

function normalize(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  if (!norm) throw new Error("embedding had zero magnitude");
  return values.map((v) => v / norm);
}

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
