import "server-only";

import {
  generateObject,
  generateText,
  isStepCount,
  streamText,
  type ToolSet,
} from "ai";

import type { SharedV4ProviderOptions } from "@ai-sdk/provider";

import { groqCapability } from "@/lib/ai/groqCaps";
import type { ReasoningEffort } from "@/lib/ai/options";
import { resolveModel, type ModelRef } from "@/lib/ai/providers";
import { structuredRouting } from "@/lib/ai/registry";

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
    maxOutputTokens: maxTokens + googleThinkingBudget(ref),
    providerOptions: reasoningOptions(ref),
  });
  return text.trim();
}


const GOOGLE_THINKING: Record<ReasoningEffort, number> = {
  none: 0,
  low: 1024,
  medium: 4096,
  high: 8192,
};

function googleThinkingBudget(ref: ModelRef): number {
  return ref.provider === "google"
    ? GOOGLE_THINKING[ref.reasoningEffort ?? "low"]
    : 0;
}

function reasoningOptions(ref: ModelRef): SharedV4ProviderOptions | undefined {
  if (ref.provider === "google") {
    return {
      google: { thinkingConfig: { thinkingBudget: googleThinkingBudget(ref) } },
    };
  }
  if (ref.provider === "groq") {
    const supported =
      groqCapability(ref.model).reasoning && ref.reasoningEffort !== "none";
    return supported
      ? { groq: { reasoningEffort: ref.reasoningEffort } }
      : undefined;
  }
  return {
    openrouter: {
      reasoning: {
        enabled: ref.reasoningEffort !== "none",
        effort: ref.reasoningEffort,
      },
    },
  };
}

export type CoachEvent =
  | { type: "status"; tool: string }
  | { type: "reasoning"; text: string }
  | { type: "delta"; text: string };

export async function chatToolsStream(
  ref: ModelRef,
  options: {
    instructions: string;
    messages: { role: "user" | "assistant"; content: string }[];
    tools: ToolSet;
    maxSteps?: number;
    maxTokens?: number;
    onEvent: (event: CoachEvent) => void;
  },
): Promise<{ text: string; toolLog: string[] }> {
  const model = resolveModel(ref);
  const maxTokens = options.maxTokens ?? 3000;
  const result = streamText({
    model,
    instructions: options.instructions,
    messages: options.messages,
    tools: options.tools,
    stopWhen: isStepCount(options.maxSteps ?? 5),
    maxOutputTokens: maxTokens + googleThinkingBudget(ref),
    providerOptions: reasoningOptions(ref),
  });

  const toolLog: string[] = [];
  let text = "";
  for await (const part of result.fullStream) {
    if (part.type === "tool-call") {
      options.onEvent({ type: "status", tool: part.toolName });
    } else if (part.type === "tool-result") {
      toolLog.push(
        `${part.toolName}(${JSON.stringify(part.input)}) -> ${JSON.stringify(part.output).slice(0, 400)}`,
      );
    } else if (part.type === "reasoning-delta") {
      options.onEvent({ type: "reasoning", text: part.text });
    } else if (part.type === "text-delta") {
      text += part.text;
      options.onEvent({ type: "delta", text: part.text });
    }
  }

  if (text.trim()) return { text: text.trim(), toolLog };

  const gathered = toolLog.length
    ? `Data already read from the app:\n${toolLog.join("\n")}`
    : "No data could be read from the app.";
  const closing = streamText({
    model,
    instructions: `${options.instructions}\n\nAnswer the user now from the data below. Do not ask for more data.`,
    messages: [...options.messages, { role: "user", content: gathered }],
    maxOutputTokens: maxTokens + googleThinkingBudget(ref),
    providerOptions: reasoningOptions(ref),
  });
  for await (const delta of closing.textStream) {
    text += delta;
    options.onEvent({ type: "delta", text: delta });
  }
  return { text: text.trim(), toolLog };
}

export async function chatTools(
  ref: ModelRef,
  options: {
    instructions: string;
    messages: { role: "user" | "assistant"; content: string }[];
    tools: ToolSet;
    maxSteps?: number;
    maxTokens?: number;
  },
): Promise<{ text: string; toolLog: string[] }> {
  const model = resolveModel(ref);
  const maxTokens = options.maxTokens ?? 3000;
  const providerOptions = reasoningOptions(ref);
  const result = await generateText({
    model,
    instructions: options.instructions,
    messages: options.messages,
    tools: options.tools,
    stopWhen: isStepCount(options.maxSteps ?? 5),
    maxOutputTokens: maxTokens + googleThinkingBudget(ref),
    providerOptions,
  });
  const toolLog = result.steps.flatMap((step) =>
    step.toolResults.map(
      (tool) =>
        `${tool.toolName}(${JSON.stringify(tool.input)}) -> ${JSON.stringify(tool.output).slice(0, 400)}`,
    ),
  );

  let text = result.text.trim();
  if (!text) {
    const gathered = toolLog.length
      ? `Data already read from the app:\n${toolLog.join("\n")}`
      : "No data could be read from the app.";
    const closing = await generateText({
      model,
      instructions: `${options.instructions}\n\nAnswer the user now from the data below. Do not ask for more data.`,
      messages: [...options.messages, { role: "user", content: gathered }],
      maxOutputTokens: maxTokens + googleThinkingBudget(ref),
      providerOptions,
    });
    text = closing.text.trim();
  }
  return { text, toolLog };
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
  signal?: AbortSignal,
): Promise<T> {
  const providerOptions: SharedV4ProviderOptions | undefined =
    ref.provider === "google"
      ? { google: { thinkingConfig: { thinkingBudget: 0 } } }
      : undefined;
  let routeOnly: string[] | null | undefined;
  try {
    routeOnly = await structuredRouting(ref.provider, ref.model);
  } catch {
    throw new Error(
      `Could not verify structured output support for ${ref.model}. Try again.`,
    );
  }
  if (routeOnly === null) {
    throw new Error(`Model ${ref.model} has no provider with structured output`);
  }
  const { instructions, turns } = split(messages);
  try {
    const { object } = await generateObject({
      model: resolveModel(routeOnly ? { ...ref, routeOnly } : ref),
      instructions,
      messages: turns,
      maxOutputTokens: maxTokens,
      providerOptions,
      abortSignal: signal,
      output: "no-schema",
      repairText: async (options) => unwrapJson(options),
    });
    return object as T;
  } catch (error) {
    const raw = (error as { text?: string })?.text;
    console.error(
      `chatJson failed on ${ref.provider}/${ref.model}`,
      (error as Error).message,
      raw ? `raw tail: ${raw.slice(-400)}` : "no raw text on the error",
    );
    throw error;
  }
}
