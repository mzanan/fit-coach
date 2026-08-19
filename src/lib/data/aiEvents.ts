import "server-only";

import { createHash } from "node:crypto";

import { desc, eq, lt } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { newId } from "@/lib/utils";

const { ai_events } = schema;

export type AiEventKind =
  | "write_requested_unresolved"
  | "tool_repair"
  | "turn_limit_hit"
  | "rate_limited"
  | "cron_maintenance"
  | "exchange"
  | "fact_extraction_failed";

export interface UsageTotals {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ExchangeDetail extends UsageTotals {
  messageId: string;
  promptHash: string;
  promptChars: number;
  prompt?: string;
}

export interface AiEvent {
  id: string;
  provider: string | null;
  model: string | null;
  kind: AiEventKind;
  detail: string | null;
  created_at: Date;
}

export async function logAiEvent(
  userId: string,
  kind: AiEventKind,
  opts?: { provider?: string; model?: string; detail?: string },
): Promise<void> {
  try {
    await db.insert(ai_events).values({
      id: newId(),
      user_id: userId,
      provider: opts?.provider ?? null,
      model: opts?.model ?? null,
      kind,
      detail: opts?.detail ?? null,
      created_at: new Date(),
    });
  } catch (err) {
    console.error(
      "ai_events: failed to log event",
      kind,
      err instanceof Error ? err.message : err,
    );
  }
}

export async function logExchange(
  userId: string,
  ref: { provider: string; model: string },
  messageId: string,
  prompt: string,
  usage: UsageTotals,
): Promise<void> {
  const detail: ExchangeDetail = {
    messageId,
    promptHash: createHash("sha256").update(prompt).digest("hex").slice(0, 16),
    promptChars: prompt.length,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    ...(process.env.NODE_ENV === "production" ? {} : { prompt }),
  };
  await logAiEvent(userId, "exchange", {
    provider: ref.provider,
    model: ref.model,
    detail: JSON.stringify(detail),
  });
}

export function parseExchangeDetail(raw: string | null): ExchangeDetail | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExchangeDetail;
    return typeof parsed?.messageId === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function eventDetailText(event: AiEvent): string | null {
  if (event.kind === "exchange") {
    const parsed = parseExchangeDetail(event.detail);
    return parsed ? exchangeSummary(parsed) : event.detail;
  }
  return event.detail;
}

export function exchangeSummary(detail: ExchangeDetail): string {
  const tokens =
    detail.inputTokens != null || detail.outputTokens != null
      ? `${detail.inputTokens ?? "?"} in / ${detail.outputTokens ?? "?"} out tokens`
      : "token usage not reported";
  return `${tokens} · prompt ${detail.promptChars} chars (${detail.promptHash}) · msg ${detail.messageId.slice(0, 8)}`;
}

const RECENT_EVENTS_LIMIT = 50;

export async function recentAiEvents(userId: string): Promise<AiEvent[]> {
  const rows = await db
    .select({
      id: ai_events.id,
      provider: ai_events.provider,
      model: ai_events.model,
      kind: ai_events.kind,
      detail: ai_events.detail,
      created_at: ai_events.created_at,
    })
    .from(ai_events)
    .where(eq(ai_events.user_id, userId))
    .orderBy(desc(ai_events.created_at))
    .limit(RECENT_EVENTS_LIMIT);

  return rows.map((row) => ({ ...row, kind: row.kind as AiEventKind }));
}

const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export async function pruneAiEvents(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  try {
    const deleted = await db
      .delete(ai_events)
      .where(lt(ai_events.created_at, cutoff))
      .returning({ id: ai_events.id });
    return { deleted: deleted.length };
  } catch (err) {
    console.error(
      "ai_events: pruneAiEvents failed",
      err instanceof Error ? err.message : err,
    );
    return { deleted: 0 };
  }
}
