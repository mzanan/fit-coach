"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { clearCoachChat, updateReasoningEffortAction } from "@/lib/actions/coach";
import type { DaySummary } from "@/lib/ai/coach";
import type { ReasoningEffort } from "@/lib/ai/options";
import { INTERRUPTED_ANSWER } from "@/lib/constants";
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
  | {
      type: "done";
      text: string;
      generated: boolean;
      daySummary?: DaySummary;
    }
  | { type: "approval"; approvalId: string; previews: PendingPreview[] }
  | { type: "error" };

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
    status: message.status,
    daySummary: message.daySummary,
  }));
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
  const [pending, setPending] = useState<PendingApproval | null>(initialPending);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [streaming, setStreaming] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);

  useEffect(() => {
    anchor?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [anchor, bubbles, loading, streaming, pending]);

  const consume = useCallback(async (url: string, body: unknown) => {
    setLoading(true);
    setStatus(STATUS.thinking);
    setStreaming("");

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
      let daySummary: DaySummary | undefined;
      let approval: PendingApproval | null = null;

      for await (const event of readNdjson<CoachStreamEvent>(res.body)) {
        if (event.type === "status") {
          setStatus(STATUS[event.tool] ?? STATUS.thinking);
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
        setBubbles((current) => [
          ...current,
          {
            ...localBubble("assistant", answer),
            generated,
            reasoning: thoughts.trim() || undefined,
            daySummary,
          },
        ]);
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
      setController(null);
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
      if (asked) setBubbles((current) => [...current, localBubble("user", asked)]);
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
