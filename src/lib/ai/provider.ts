import "server-only";

import { generateObject, generateText } from "ai";

import { resolveModel, type ModelRef } from "@/lib/ai/providers";
import { structuredRouteOnly } from "@/lib/ai/registry";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function split(messages: ChatMessage[]): {
  instructions: string | undefined;
  turns: { role: "user" | "assistant"; content: string }[];
} {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content);
  const turns = messages.filter(
    (message): message is { role: "user" | "assistant"; content: string } =>
      message.role !== "system",
  );
  return {
    instructions: system.length ? system.join("\n\n") : undefined,
    turns,
  };
}

export async function chat(
  ref: ModelRef,
  messages: ChatMessage[],
  maxTokens = 600,
): Promise<string> {
  const { instructions, turns } = split(messages);
  const { text } = await generateText({
    model: resolveModel(ref),
    instructions,
    messages: turns,
    maxOutputTokens: maxTokens,
  });
  return text.trim();
}

function unwrapJson({ text }: { text: string }): string | null {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  const sliced = stripped.slice(start, end + 1);
  return sliced === text ? null : sliced;
}

export async function chatJson<T>(
  ref: ModelRef,
  messages: ChatMessage[],
  maxTokens = 4000,
): Promise<T> {
  let routeOnly: string[] | null;
  try {
    routeOnly = await structuredRouteOnly(ref.model);
  } catch {
    throw new Error(
      `Could not verify structured output support for ${ref.model}. Try again.`,
    );
  }
  if (routeOnly === null) {
    throw new Error(`Model ${ref.model} has no provider with structured output`);
  }
  const { instructions, turns } = split(messages);
  const { object } = await generateObject({
    model: resolveModel({ ...ref, routeOnly }),
    instructions,
    messages: turns,
    maxOutputTokens: maxTokens,
    output: "no-schema",
    repairText: async (options) => unwrapJson(options),
  });
  return object as T;
}
