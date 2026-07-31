import "server-only";

import { generateObject, generateText } from "ai";

import {
  resolveModel,
  systemModelRef,
  type ModelRef,
} from "@/lib/ai/providers";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function hasAi(): boolean {
  return Boolean(systemModelRef());
}

function requireRef(ref?: ModelRef): ModelRef {
  const resolved = ref ?? systemModelRef();
  if (!resolved) throw new Error("OPENROUTER_API_KEY or AI_MODEL not set");
  return resolved;
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
  messages: ChatMessage[],
  maxTokens = 600,
  ref?: ModelRef,
): Promise<string> {
  const { instructions, turns } = split(messages);
  const { text } = await generateText({
    model: resolveModel(requireRef(ref)),
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
  messages: ChatMessage[],
  maxTokens = 4000,
  ref?: ModelRef,
): Promise<T> {
  const { instructions, turns } = split(messages);
  const { object } = await generateObject({
    model: resolveModel(requireRef(ref)),
    instructions,
    messages: turns,
    maxOutputTokens: maxTokens,
    output: "no-schema",
    repairText: async (options) => unwrapJson(options),
  });
  return object as T;
}
