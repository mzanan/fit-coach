"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { clearCoachChat } from "@/lib/actions/coach";
import type { CoachMessage } from "@/lib/data/coachMessages";

export interface ChatBubble {
  id: string;
  role: "user" | "assistant";
  content: string;
  generated: boolean;
}

function toBubbles(messages: CoachMessage[]): ChatBubble[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    generated: message.generated,
  }));
}

export function useCoachChat(initial: CoachMessage[]) {
  const [bubbles, setBubbles] = useState<ChatBubble[]>(() => toBubbles(initial));
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    anchor?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [anchor, bubbles, loading]);

  const ask = useCallback(
    async (text?: string) => {
      const asked = (text ?? question).trim();
      if (loading) return;
      setQuestion("");
      if (asked) {
        setBubbles((current) => [
          ...current,
          { id: `local-${Date.now()}`, role: "user", content: asked, generated: true },
        ]);
      }
      setLoading(true);
      try {
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: asked || undefined }),
        });
        if (!res.ok) throw new Error("Coach unavailable");
        const data = (await res.json()) as { text: string; generated: boolean };
        setBubbles((current) => [
          ...current,
          {
            id: `local-${Date.now()}-a`,
            role: "assistant",
            content: data.text,
            generated: data.generated,
          },
        ]);
      } catch {
        toast.error("Could not reach the coach");
      } finally {
        setLoading(false);
      }
    },
    [question, loading],
  );

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
    ask,
    setAnchor,
    confirmOpen,
    setConfirmOpen,
    clear,
  };
}
