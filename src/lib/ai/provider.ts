import "server-only";

import type { ZodType } from "zod";

import {
  generateObject,
  generateText,
  isStepCount,
  streamText,
  NoObjectGeneratedError,
  NoSuchToolError,
  type FinishReason,
  type LanguageModel,
  type LanguageModelUsage,
  type ModelMessage,
  type ToolCallRepairFunction,
  type ToolSet,
} from "ai";

import type { SharedV4ProviderOptions } from "@ai-sdk/provider";
import { after } from "next/server";

import { resolveModel, type ModelRef } from "@/lib/ai/aiCredentials";
import { groqCapability, structuredRouting } from "@/lib/ai/capabilities";
import {
  COACH_CONTINUATION_LIMIT,
  COACH_MAX_TOOL_STEPS,
} from "@/lib/ai/limits";
import type { ReasoningEffort } from "@/lib/ai/options";
import { logAiEvent, type UsageTotals } from "@/lib/data/aiEvents";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function addUsage(
  totals: UsageTotals,
  usage: LanguageModelUsage | undefined,
): void {
  if (!usage) return;
  if (usage.inputTokens != null) {
    totals.inputTokens = (totals.inputTokens ?? 0) + usage.inputTokens;
  }
  if (usage.outputTokens != null) {
    totals.outputTokens = (totals.outputTokens ?? 0) + usage.outputTokens;
  }
  if (usage.totalTokens != null) {
    totals.totalTokens = (totals.totalTokens ?? 0) + usage.totalTokens;
  }
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
  signal?: AbortSignal,
  onUsage?: (usage: UsageTotals) => void,
): Promise<string> {
  const { instructions, turns } = split(messages);
  const maxOutputTokens = maxTokens + googleThinkingBudget(ref);
  const providerOptions = googleOnlyOptions(ref);
  const model = resolveModel(ref);
  const totals: UsageTotals = {};
  const { text, finishReason, usage } = await generateText({
    model,
    instructions,
    messages: turns,
    maxOutputTokens,
    providerOptions,
    abortSignal: signal,
  });
  addUsage(totals, usage);
  if (finishReason !== "length" || !text.trim()) {
    onUsage?.(totals);
    return text.trim();
  }
  const continued = await continueGeneratedText(
    model,
    instructions,
    turns,
    text,
    maxOutputTokens,
    providerOptions,
    signal,
    totals,
  );
  if (!continued.restarted || signal?.aborted) {
    onUsage?.(totals);
    return continued.text;
  }
  const retry = await generateText({
    model,
    instructions,
    messages: turns,
    maxOutputTokens: maxOutputTokens * 2,
    providerOptions,
    abortSignal: signal,
  });
  addUsage(totals, retry.usage);
  onUsage?.(totals);
  return retry.finishReason !== "length" && retry.text.trim()
    ? retry.text.trim()
    : continued.text;
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

function googleOnlyOptions(ref: ModelRef): SharedV4ProviderOptions | undefined {
  return ref.provider === "google" ? reasoningOptions(ref) : undefined;
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

const TEXT_CONTINUE_LIMIT = COACH_CONTINUATION_LIMIT;
const OVERLAP_WINDOW = 80;
const MIN_OVERLAP = 4;

const CONTINUE_PROMPT =
  "Continue the answer below from exactly where it stops. Write only the missing rest of it, do not repeat any word already written, no preface, no re-greeting. If it already reads as a complete answer, reply with nothing.";

function stripOverlap(
  precedingTail: string,
  next: string,
): { text: string; stripped: boolean } {
  const max = Math.min(precedingTail.length, next.length, OVERLAP_WINDOW);
  for (let len = max; len >= MIN_OVERLAP; len--) {
    if (precedingTail.slice(-len) === next.slice(0, len)) {
      return { text: next.slice(len), stripped: true };
    }
  }
  return { text: next, stripped: false };
}

const RESTART_PROBE = 24;

function normalizedHead(value: string, length: number): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim().slice(0, length);
}

function isRestartedContinuation(prior: string, next: string): boolean {
  const head = normalizedHead(prior, RESTART_PROBE);
  return (
    head.length === RESTART_PROBE &&
    normalizedHead(next, RESTART_PROBE) === head
  );
}

function continuationDelta(prior: string, next: string): string {
  const { text, stripped } = stripOverlap(prior.slice(-OVERLAP_WINDOW), next);
  if (!text) return "";
  if (stripped || !prior) return text;
  const priorClean = /[\s([{-]$/.test(prior);
  const nextClean = /^[\s.,;:!?)\]}-]/.test(text);
  return priorClean || nextClean ? text : ` ${text}`;
}

async function continueGeneratedText(
  model: LanguageModel,
  instructions: string | undefined,
  priorMessages: { role: "user" | "assistant"; content: string }[],
  text: string,
  maxOutputTokens: number,
  providerOptions: SharedV4ProviderOptions | undefined,
  signal: AbortSignal | undefined,
  totals?: UsageTotals,
): Promise<{ text: string; restarted: boolean }> {
  let finishReason: FinishReason = "length";
  for (let i = 0; i < TEXT_CONTINUE_LIMIT && finishReason === "length"; i++) {
    const result = await generateText({
      model,
      instructions,
      messages: [
        ...priorMessages,
        { role: "assistant", content: text },
        { role: "user", content: CONTINUE_PROMPT },
      ],
      maxOutputTokens,
      providerOptions,
      abortSignal: signal,
    });
    if (totals) addUsage(totals, result.usage);
    if (isRestartedContinuation(text, result.text)) {
      return { text: text.trim(), restarted: true };
    }
    text += continuationDelta(text, result.text);
    finishReason = result.finishReason;
  }
  return { text: text.trim(), restarted: false };
}

async function continueStreamedText(
  model: LanguageModel,
  instructions: string,
  priorMessages: ModelMessage[],
  priorText: string,
  maxOutputTokens: number,
  providerOptions: SharedV4ProviderOptions | undefined,
  signal: AbortSignal | undefined,
  onEvent: (event: CoachEvent) => void,
  tools?: ToolSet,
  totals?: UsageTotals,
): Promise<{ text: string; newMessages: ModelMessage[]; aborted: boolean }> {
  let finishReason: FinishReason = "length";
  let aborted = false;
  let text = "";
  let messages = priorMessages;
  const newMessages: ModelMessage[] = [];
  for (
    let i = 0;
    i < TEXT_CONTINUE_LIMIT && finishReason === "length" && !aborted;
    i++
  ) {
    const turn: ModelMessage = { role: "user", content: CONTINUE_PROMPT };
    const result = streamText({
      model,
      instructions,
      messages: [...messages, turn],
      tools,
      maxOutputTokens,
      providerOptions,
      abortSignal: signal,
    });
    let sawFinish = false;
    let stepText = "";
    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        stepText += part.text;
      } else if (part.type === "finish") {
        sawFinish = true;
        finishReason = part.finishReason;
        if (totals) addUsage(totals, part.totalUsage);
      } else if (part.type === "abort") {
        aborted = true;
      }
    }
    if (isRestartedContinuation(priorText, stepText)) break;
    const delta = continuationDelta(priorText + text, stepText);
    if (delta) {
      text += delta;
      onEvent({ type: "delta", text: delta });
    }
    const stepMessages = await result.responseMessages;
    messages = [...messages, turn, ...stepMessages];
    newMessages.push(turn, ...stepMessages);
    if (aborted && !sawFinish) break;
  }
  return { text, newMessages, aborted };
}

export type CoachEvent =
  | { type: "status"; tool: string }
  | { type: "reasoning"; text: string }
  | { type: "delta"; text: string }
  | { type: "question"; text: string }
  | { type: "started"; assistantId: string; ids: string[] }
  | { type: "rate_limited"; retryAfterMs?: number };

export interface ApprovalRequest {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  input: unknown;
}

export interface WriteOutput {
  toolCallId: string;
  toolName: string;
  logged: boolean;
  error?: string;
}

export interface ToolStreamResult {
  text: string;
  toolLog: string[];
  approvals: ApprovalRequest[];
  messages: ModelMessage[];
  writeAttempted: boolean;
  writeOutputs: WriteOutput[];
  interrupted: boolean;
  usage: UsageTotals;
}

export interface ToolStreamOptions {
  userId: string;
  instructions: string;
  messages: ModelMessage[];
  tools: ToolSet;
  approvalFor?: string | string[];
  maxSteps?: number;
  maxTokens?: number;
  onEvent: (event: CoachEvent) => void;
  signal?: AbortSignal;
}

function approvalSet(approvalFor: string | string[] | undefined): Set<string> {
  if (!approvalFor) return new Set();
  return new Set(Array.isArray(approvalFor) ? approvalFor : [approvalFor]);
}

function repairToolName(
  tools: ToolSet,
  approvalFor: string | string[] | undefined,
  ref: ModelRef,
  userId: string,
): ToolCallRepairFunction<ToolSet> {
  const gated = approvalSet(approvalFor);
  return async ({ toolCall, error }) => {
    if (NoSuchToolError.isInstance(error)) {
      const cleaned = Object.keys(tools).find((name) =>
        toolCall.toolName.startsWith(name),
      );
      if (cleaned) {
        console.warn(
          `coach: malformed tool name ${toolCall.toolName}, repaired to ${cleaned}`,
        );
        await logAiEvent(userId, "tool_repair", {
          provider: ref.provider,
          model: ref.model,
          detail: `${toolCall.toolName} -> ${cleaned}`,
        });
        return { ...toolCall, toolName: cleaned };
      }
      const gatedOut = Boolean(
        gated.has(toolCall.toolName) && !(toolCall.toolName in tools),
      );
      const log = gatedOut ? console.warn : console.error;
      log(
        `coach: unrepairable tool name ${toolCall.toolName}${gatedOut ? " (the approval-gated tool is not registered for this model, likely the cause)" : ""}, user=${userId} model=${ref.provider}/${ref.model}`,
      );
      if (!gatedOut) {
        const kind = gated.has(toolCall.toolName)
          ? "write_requested_unresolved"
          : "tool_repair";
        await logAiEvent(userId, kind, {
          provider: ref.provider,
          model: ref.model,
          detail: `unrepairable tool name ${toolCall.toolName}`,
        });
      }
      return null;
    }
    console.warn(
      `coach: invalid input for ${toolCall.toolName}: ${toolCall.input}`,
    );
    return null;
  };
}

export async function chatToolsStream(
  ref: ModelRef,
  options: ToolStreamOptions,
): Promise<ToolStreamResult> {
  const model = resolveModel(ref, (retryAfterMs) => {
    options.onEvent({ type: "rate_limited", retryAfterMs });
    after(() =>
      logAiEvent(options.userId, "rate_limited", {
        provider: ref.provider,
        model: ref.model,
        detail: retryAfterMs ? `retry in ${retryAfterMs}ms` : undefined,
      }),
    );
  });
  const maxTokens = options.maxTokens ?? 3000;
  const maxOutputTokens = maxTokens + googleThinkingBudget(ref);
  const providerOptions = reasoningOptions(ref);
  const gated = approvalSet(options.approvalFor);
  const result = streamText({
    model,
    instructions: options.instructions,
    messages: options.messages,
    tools: options.tools,
    toolApproval: gated.size
      ? Object.fromEntries([...gated].map((name) => [name, "user-approval"]))
      : undefined,
    repairToolCall: repairToolName(
      options.tools,
      options.approvalFor,
      ref,
      options.userId,
    ),
    stopWhen: isStepCount(options.maxSteps ?? COACH_MAX_TOOL_STEPS),
    maxOutputTokens,
    providerOptions,
    abortSignal: options.signal,
  });

  const toolLog: string[] = [];
  const approvals: ApprovalRequest[] = [];
  const writeOutputs: WriteOutput[] = [];
  const usageTotals: UsageTotals = {};
  let writeAttempted = false;
  let text = "";
  let sawAbort = false;
  let sawFinish = false;
  let finishReason: FinishReason | undefined;
  for await (const part of result.fullStream) {
    if (part.type === "tool-call") {
      if (gated.has(part.toolName)) writeAttempted = true;
      options.onEvent({ type: "status", tool: part.toolName });
    } else if (part.type === "tool-approval-request") {
      console.info(
        `coach: approval requested for ${part.toolCall.toolName} ${JSON.stringify(part.toolCall.input)}`,
      );
      approvals.push({
        approvalId: part.approvalId,
        toolCallId: part.toolCall.toolCallId,
        toolName: part.toolCall.toolName,
        input: part.toolCall.input,
      });
    } else if (part.type === "tool-result") {
      if (gated.has(part.toolName)) {
        const output = part.output as { logged?: unknown; error?: unknown };
        writeOutputs.push({
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          logged: output?.logged === true,
          error: typeof output?.error === "string" ? output.error : undefined,
        });
      }
      toolLog.push(
        `${part.toolName}(${JSON.stringify(part.input)}) -> ${JSON.stringify(part.output).slice(0, 400)}`,
      );
    } else if (part.type === "reasoning-delta") {
      options.onEvent({ type: "reasoning", text: part.text });
    } else if (part.type === "text-delta") {
      text += part.text;
      options.onEvent({ type: "delta", text: part.text });
    } else if (part.type === "abort") {
      sawAbort = true;
    } else if (part.type === "finish") {
      sawFinish = true;
      finishReason = part.finishReason;
      addUsage(usageTotals, part.totalUsage);
    }
  }
  let interrupted = sawAbort && !sawFinish;
  let messages: ModelMessage[] = await result.responseMessages;

  if (finishReason === "length" && text.trim() && !interrupted) {
    const continued = await continueStreamedText(
      model,
      options.instructions,
      [...options.messages, ...messages],
      text,
      maxOutputTokens,
      providerOptions,
      options.signal,
      options.onEvent,
      options.tools,
      usageTotals,
    );
    text += continued.text;
    messages = [...messages, ...continued.newMessages];
    if (continued.aborted) interrupted = true;
  }

  console.info(
    `coach: ${ref.provider}/${ref.model} finished with ${approvals.length} approval(s), ${toolLog.length} tool result(s), ${text.trim().length} chars`,
  );

  if (text.trim() || approvals.length || interrupted) {
    return {
      text: text.trim(),
      toolLog,
      approvals,
      messages,
      writeAttempted,
      writeOutputs,
      interrupted,
      usage: usageTotals,
    };
  }

  const gathered = toolLog.length
    ? `Data already read from the app:\n${toolLog.join("\n")}`
    : "No data could be read from the app.";
  const closingInstructions = `${options.instructions}\n\nAnswer the user now from the data below. Do not ask for more data.`;
  const closingMessages: ModelMessage[] = [
    ...options.messages,
    { role: "user", content: gathered },
  ];
  const closing = streamText({
    model,
    instructions: closingInstructions,
    messages: closingMessages,
    maxOutputTokens,
    providerOptions,
    abortSignal: options.signal,
  });
  sawAbort = false;
  sawFinish = false;
  finishReason = undefined;
  for await (const part of closing.fullStream) {
    if (part.type === "text-delta") {
      text += part.text;
      options.onEvent({ type: "delta", text: part.text });
    } else if (part.type === "abort") {
      sawAbort = true;
    } else if (part.type === "finish") {
      sawFinish = true;
      finishReason = part.finishReason;
      addUsage(usageTotals, part.totalUsage);
    }
  }
  interrupted = sawAbort && !sawFinish;

  if (finishReason === "length" && text.trim() && !interrupted) {
    const closingResponseMessages = await closing.responseMessages;
    const continued = await continueStreamedText(
      model,
      closingInstructions,
      [...closingMessages, ...closingResponseMessages],
      text,
      maxOutputTokens,
      providerOptions,
      options.signal,
      options.onEvent,
      undefined,
      usageTotals,
    );
    text += continued.text;
    if (continued.aborted) interrupted = true;
  }

  return {
    text: text.trim(),
    toolLog,
    approvals,
    messages,
    writeAttempted,
    writeOutputs,
    interrupted,
    usage: usageTotals,
  };
}

export function approvalResponseMessage(
  approvalIds: string[],
  approved: boolean,
): ModelMessage {
  return {
    role: "tool",
    content: approvalIds.map((approvalId) => ({
      type: "tool-approval-response" as const,
      approvalId,
      approved,
    })),
  } as unknown as ModelMessage;
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
  schema?: ZodType<T>,
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
    throw new Error(
      `Model ${ref.model} has no provider with structured output`,
    );
  }
  const { instructions, turns } = split(messages);
  const model = resolveModel(routeOnly ? { ...ref, routeOnly } : ref);
  const attempt = () =>
    generateObject({
      model,
      instructions,
      messages: turns,
      maxOutputTokens: maxTokens,
      providerOptions,
      abortSignal: signal,
      output: "no-schema",
      repairText: async (options) => unwrapJson(options),
    });
  const validate = (object: unknown): T => {
    if (!schema) return object as T;
    const parsed = schema.safeParse(object);
    if (!parsed.success) {
      console.error(
        `chatJson schema mismatch on ${ref.provider}/${ref.model}`,
        parsed.error.issues.slice(0, 5),
        process.env.NODE_ENV === "production"
          ? undefined
          : JSON.stringify(object).slice(0, 600),
      );
      throw parsed.error;
    }
    return parsed.data;
  };
  try {
    const { object } = await attempt();
    return validate(object);
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && !error.text) {
      console.error(
        `chatJson got an empty response from ${ref.provider}/${ref.model}, retrying once`,
      );
      try {
        const { object } = await attempt();
        return validate(object);
      } catch (retryError) {
        error = retryError;
      }
    }
    const raw = (error as { text?: string })?.text;
    console.error(
      `chatJson failed on ${ref.provider}/${ref.model}`,
      (error as Error).message,
      raw ? `raw tail: ${raw.slice(-400)}` : "no raw text on the error",
    );
    throw error;
  }
}
