"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { clearCoachChat, updateReasoningEffortAction } from "@/lib/actions/coach";
import type { ReasoningEffort } from "@/lib/ai/options";
import type { CoachMessage } from "@/lib/data/coachMessages";

export interface ChatBubble {
  id: string;
  role: "user" | "assistant";
  content: string;
  generated: boolean;
  reasoning?: string;
}

type CoachStreamEvent =
  | { type: "status"; tool: string }
  | { type: "reasoning"; text: string }
  | { type: "delta"; text: string }
  | { type: "done"; text: string; generated: boolean }
  | { type: "error" };

const STATUS: Record<string, string> = {
  thinking: "Thinking",
  get_today: "Reading today's meals and targets",
  search_catalog: "Searching your catalog",
  get_workouts: "Reading your recent workouts",
  get_body_scans: "Reading your body scans",
};

function toBubbles(messages: CoachMessage[]): ChatBubble[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    generated: message.generated,
  }));
}

export function useCoachChat(
  initial: CoachMessage[],
  initialEffort: ReasoningEffort | null,
) {
  const [effort, setEffortState] = useState(initialEffort);
  const [bubbles, setBubbles] = useState<ChatBubble[]>(() => toBubbles(initial));
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
  }, [anchor, bubbles, loading, streaming]);

  const ask = useCallback(
    async (text?: string) => {
      const asked = (text ?? question).trim();
      if (loading) return;
      if (!asked && bubbles.length) return;
      setQuestion("");
      if (asked) {
        setBubbles((current) => [
          ...current,
          { id: `local-${Date.now()}`, role: "user", content: asked, generated: true },
        ]);
      }
      setLoading(true);
      setStatus(STATUS.thinking);
      setStreaming("");

      const abort = new AbortController();
      setController(abort);
      try {
        const res = await fetch("/api/coach", {
          method: "POST",
          signal: abort.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: asked || undefined }),
        });
        if (!res.ok || !res.body) throw new Error("Coach unavailable");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let answer = "";
        let thoughts = "";
        let generated = true;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as CoachStreamEvent;
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
            } else {
              throw new Error("Coach failed");
            }
          }
        }

        setBubbles((current) => [
          ...current,
          {
            id: `local-${Date.now()}-a`,
            role: "assistant",
            content: answer,
            generated,
            reasoning: thoughts.trim() || undefined,
          },
        ]);
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
    },
    [question, loading, bubbles.length],
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
    ask,
    stop,
    setAnchor,
    confirmOpen,
    setConfirmOpen,
    effort,
    setEffort,
    clear,
  };
}
