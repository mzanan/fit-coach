"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { clearCoachChat, updateReasoningEffortAction } from "@/lib/actions/coach";
import type { ReasoningEffort } from "@/lib/ai/options";
import type { CoachMessage } from "@/lib/data/coachMessages";
import type { PendingPreview } from "@/lib/data/coachPendingWrite";
import { readNdjson } from "@/lib/ndjson";

export interface ChatBubble {
  id: string;
  role: "user" | "assistant";
  content: string;
  generated: boolean;
  reasoning?: string;
}

export interface PendingApproval {
  approvalId: string;
  preview: PendingPreview;
  question: string | null;
}

type CoachStreamEvent =
  | { type: "status"; tool: string }
  | { type: "reasoning"; text: string }
  | { type: "delta"; text: string }
  | { type: "done"; text: string; generated: boolean }
  | { type: "approval"; approvalId: string; preview: PendingPreview }
  | { type: "error" };

const STATUS: Record<string, string> = {
  thinking: "Thinking",
  get_today: "Reading today's meals and targets",
  search_catalog: "Searching your catalog",
  get_workouts: "Reading your recent workouts",
  get_body_scans: "Reading your body scans",
  log_meal: "Preparing to log a meal",
};

function toBubbles(messages: CoachMessage[]): ChatBubble[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    generated: message.generated,
  }));
}

function localBubble(role: "user" | "assistant", content: string): ChatBubble {
  return { id: `local-${Date.now()}-${role}`, role, content, generated: true };
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
      let approval: PendingApproval | null = null;

      for await (const event of readNdjson<CoachStreamEvent>(res.body)) {
        if (event.type === "status") {
          setStatus(STATUS[event.tool] ?? STATUS.thinking);
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
        } else if (event.type === "approval") {
          approval = {
            approvalId: event.approvalId,
            preview: event.preview,
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
          },
        ]);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
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

  const decide = useCallback(
    async (approved: boolean) => {
      if (!pending || loading) return;
      const { approvalId } = pending;
      setPending(null);
      await consume("/api/coach/approve", { approvalId, approved });
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
