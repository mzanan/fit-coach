"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  clearCoachChat,
  updateReasoningEffortAction,
} from "@/lib/actions/coach";
import type { DaySummary } from "@/lib/ai/coach";
import type { ReasoningEffort } from "@/lib/ai/options";
import {
  COACH_MAX_DURATION_SECONDS,
  INTERRUPTED_ANSWER,
} from "@/lib/constants";
import { settledLearned, type LearnedState } from "@/lib/coachLearned";
import type {
  CoachMessage,
  CoachMessageStatus,
} from "@/lib/data/coachMessages";
import type { PendingPreview } from "@/lib/data/coachPendingWrite";
import { readNdjson } from "@/lib/ndjson";

export interface ChatBubble {
  id: string;
  role: "user" | "assistant";
  content: string;
  generated: boolean;
  status: CoachMessageStatus;
  reasoning?: string;
  daySummary?: DaySummary;
  learned?: LearnedState;
}

export interface PendingApproval {
  approvalId: string;
  previews: PendingPreview[];
  question: string | null;
}

type CoachStreamEvent =
  | { type: "status"; tool: string }
  | { type: "reasoning"; text: string }
  | { type: "delta"; text: string }
  | { type: "question"; text: string }
  | { type: "started"; assistantId: string; ids: string[] }
  | { type: "rate_limited"; retryAfterMs?: number }
  | {
      type: "done";
      text: string;
      generated: boolean;
      daySummary?: DaySummary;
      stopped?: boolean;
      learning?: boolean;
    }
  | { type: "approval"; approvalId: string; previews: PendingPreview[] }
  | { type: "error" };

const REATTACH_POLL_MS = 2000;
const MAX_FUNCTION_DURATION_MS = (COACH_MAX_DURATION_SECONDS + 30) * 1000;
const LEARNED_POLL_MS = 2500;
const LEARNED_POLL_TRIES = 12;

async function pollLearned(
  id: string,
  signal: AbortSignal,
): Promise<LearnedState | undefined> {
  for (let attempt = 0; attempt < LEARNED_POLL_TRIES; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, LEARNED_POLL_MS));
    if (signal.aborted) return undefined;
    try {
      const res = await fetch(`/api/coach/message/${id}`, { signal });
      if (!res.ok) return undefined;
      const data = (await res.json()) as { learned: LearnedState | null };
      if (data.learned?.state === "done") return data.learned;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

const STATUS: Record<string, string> = {
  thinking: "Thinking",
  get_today: "Reading today's meals and targets",
  search_catalog: "Searching your catalog",
  get_workouts: "Reading your recent workouts",
  get_body_scans: "Reading your body scans",
  get_progress_overview: "Reading your full progress history",
  log_meal: "Preparing to log a meal",
};

function toBubbles(messages: CoachMessage[]): ChatBubble[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    generated: message.generated,
    status:
      message.status === "streaming" && isStaleStream(message.created_at)
        ? "stopped"
        : message.status,
    daySummary: message.daySummary,
    learned: settledLearned(message.learned),
  }));
}

function isStaleStream(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > MAX_FUNCTION_DURATION_MS;
}

function localBubble(role: "user" | "assistant", content: string): ChatBubble {
  return {
    id: `local-${Date.now()}-${role}`,
    role,
    content,
    generated: true,
    status: "done",
  };
}

export function useCoachChat(
  initial: CoachMessage[],
  initialEffort: ReasoningEffort | null,
  initialPending: PendingApproval | null,
) {
  const [effort, setEffortState] = useState(initialEffort);
  const [bubbles, setBubbles] = useState<ChatBubble[]>(() => [
    ...toBubbles(initial),
    ...(initialPending?.question
      ? [localBubble("user", initialPending.question)]
      : []),
  ]);
  const [pending, setPending] = useState<PendingApproval | null>(
    initialPending,
  );
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [streaming, setStreaming] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [streamingExchange, setStreamingExchange] = useState<{
    ids: string[];
  } | null>(null);
  const activeUrlRef = useRef<string | null>(null);
  const pendingStopRef = useRef(false);
  const learnedWatchers = useRef<Set<AbortController>>(new Set());

  const stopLearnedWatchers = useCallback(() => {
    learnedWatchers.current.forEach((watcher) => watcher.abort());
    learnedWatchers.current.clear();
  }, []);

  useEffect(() => stopLearnedWatchers, [stopLearnedWatchers]);

  useEffect(() => {
    anchor?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [anchor, bubbles, loading, streaming, pending]);

  useEffect(() => {
    const last = initial[initial.length - 1];
    if (!last || last.role !== "assistant" || last.status !== "streaming") {
      return;
    }
    if (isStaleStream(last.created_at)) return;

    let cancelled = false;
    const poll = async () => {
      if (isStaleStream(last.created_at)) {
        clearInterval(interval);
        setBubbles((current) =>
          current.map((bubble) =>
            bubble.id === last.id ? { ...bubble, status: "stopped" } : bubble,
          ),
        );
        return;
      }
      try {
        const res = await fetch(`/api/coach/message/${last.id}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          content: string;
          status: CoachMessageStatus;
          generated: boolean;
          daySummary: DaySummary | null;
        };
        setBubbles((current) =>
          current.map((bubble) =>
            bubble.id === last.id
              ? {
                  ...bubble,
                  content: data.content,
                  status: data.status,
                  generated: data.generated,
                  daySummary: data.daySummary ?? undefined,
                }
              : bubble,
          ),
        );
        if (data.status !== "streaming") clearInterval(interval);
      } catch {
        // network hiccup, retry on the next tick
      }
    };

    const interval = setInterval(() => void poll(), REATTACH_POLL_MS);
    void poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [initial]);

  const consume = useCallback(async (url: string, body: unknown) => {
    setLoading(true);
    setStatus(STATUS.thinking);
    setStreaming("");
    activeUrlRef.current = url;
    pendingStopRef.current = false;

    const abort = new AbortController();
    setController(abort);
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: abort.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) throw new Error("Coach unavailable");

      let answer = "";
      let thoughts = "";
      let generated = true;
      let stopped = false;
      let learning = false;
      let assistantId: string | null = null;
      let daySummary: DaySummary | undefined;
      let approval: PendingApproval | null = null;

      for await (const event of readNdjson<CoachStreamEvent>(res.body)) {
        if (event.type === "status") {
          setStatus(STATUS[event.tool] ?? STATUS.thinking);
        } else if (event.type === "started") {
          assistantId = event.assistantId;
          setStreamingExchange({ ids: event.ids });
          if (pendingStopRef.current) {
            pendingStopRef.current = false;
            void fetch("/api/coach/stop", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: event.ids }),
            }).catch(() => {});
          }
        } else if (event.type === "rate_limited") {
          const seconds = event.retryAfterMs
            ? Math.ceil(event.retryAfterMs / 1000)
            : null;
          setStatus(
            seconds
              ? `Waiting for model quota (~${seconds}s)`
              : "Waiting for model quota",
          );
        } else if (event.type === "question") {
          setBubbles((current) => [
            ...current,
            localBubble("user", event.text),
          ]);
        } else if (event.type === "reasoning") {
          thoughts += event.text;
          setReasoning(thoughts);
        } else if (event.type === "delta") {
          answer += event.text;
          setStatus(null);
          setStreaming(answer);
        } else if (event.type === "done") {
          answer = event.text;
          generated = event.generated;
          daySummary = event.daySummary;
          stopped = event.stopped ?? false;
          learning = event.learning === true;
        } else if (event.type === "approval") {
          approval = {
            approvalId: event.approvalId,
            previews: event.previews,
            question: null,
          };
        } else {
          throw new Error("Coach failed");
        }
      }

      if (approval) {
        setPending(approval);
      } else {
        const answered = localBubble("assistant", answer);
        const watched = learning ? assistantId : null;
        const bubbleId = watched ?? answered.id;
        setBubbles((current) => [
          ...current,
          {
            ...answered,
            id: bubbleId,
            generated,
            status: stopped ? "stopped" : "done",
            reasoning: thoughts.trim() || undefined,
            daySummary,
            learned: watched ? { state: "pending" } : undefined,
          },
        ]);
        if (watched) {
          const watch = new AbortController();
          learnedWatchers.current.add(watch);
          void pollLearned(watched, watch.signal)
            .then((learned) => {
              if (watch.signal.aborted) return;
              setBubbles((current) =>
                current.map((bubble) =>
                  bubble.id === bubbleId ? { ...bubble, learned } : bubble,
                ),
              );
            })
            .finally(() => learnedWatchers.current.delete(watch));
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        setBubbles((current) => [
          ...current,
          {
            ...localBubble("assistant", INTERRUPTED_ANSWER),
            generated: false,
            status: "stopped",
          },
        ]);
      } else {
        toast.error("Could not reach the coach");
      }
    } finally {
      activeUrlRef.current = null;
      pendingStopRef.current = false;
      setController(null);
      setStreamingExchange(null);
      setStreaming("");
      setReasoning("");
      setStatus(null);
      setLoading(false);
    }
  }, []);

  const ask = useCallback(
    async (text?: string) => {
      const asked = (text ?? question).trim();
      if (loading) return;
      if (!asked && bubbles.length) return;
      setQuestion("");
      setPending(null);
      if (asked)
        setBubbles((current) => [...current, localBubble("user", asked)]);
      await consume("/api/coach", { question: asked || undefined });
    },
    [question, loading, bubbles.length, consume],
  );

  const askSummary = useCallback(async () => {
    if (loading) return;
    setPending(null);
    await consume("/api/coach", { summary: true });
  }, [loading, consume]);

  const decide = useCallback(
    async (approved: boolean, itemId?: string) => {
      if (!pending || loading) return;
      const { approvalId } = pending;
      setPending(null);
      await consume("/api/coach/approve", { approvalId, approved, itemId });
    },
    [pending, loading, consume],
  );

  function stop() {
    if (streamingExchange) {
      void fetch("/api/coach/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: streamingExchange.ids }),
      }).catch(() => {});
      return;
    }
    if (activeUrlRef.current === "/api/coach") {
      pendingStopRef.current = true;
      return;
    }
    controller?.abort();
  }

  function setEffort(next: ReasoningEffort) {
    const previous = effort;
    setEffortState(next);
    void updateReasoningEffortAction(next)
      .then((result) => {
        if (result.error) {
          toast.error(result.error);
          setEffortState(previous);
        }
      })
      .catch(() => {
        toast.error("Could not change the effort");
        setEffortState(previous);
      });
  }

  function clear() {
    stopLearnedWatchers();
    setBubbles([]);
    setPending(null);
    setConfirmOpen(false);
    void clearCoachChat().catch(() => toast.error("Could not clear the chat"));
  }

  return {
    bubbles,
    question,
    setQuestion,
    loading,
    status,
    streaming,
    reasoning,
    pending,
    ask,
    askSummary,
    decide,
    stop,
    setAnchor,
    confirmOpen,
    setConfirmOpen,
    effort,
    setEffort,
    clear,
  };
}
