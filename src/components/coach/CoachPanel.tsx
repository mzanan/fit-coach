"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import { Surface } from "@/components/ui/Surface";

const QUICK = [
  "How am I doing today?",
  "What should I eat next?",
  "Is my fat too high?",
];

export function CoachPanel() {
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  async function ask(q?: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q ?? question }),
      });
      if (!res.ok) throw new Error("Coach unavailable");
      const data = (await res.json()) as { text: string; generated: boolean };
      setReply(data.text);
      setGenerated(data.generated);
    } catch {
      toast.error("Could not reach the coach");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            disabled={loading}
            onClick={() => ask(q)}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        className="flex gap-2"
      >
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask the coach"
        />
        <Button type="submit" disabled={loading}>
          <Sparkles className="size-4" />
          Ask
        </Button>
      </form>

      {loading ? (
        <Surface className="p-4 text-sm text-muted-foreground">
          Thinking...
        </Surface>
      ) : reply ? (
        <Surface className="space-y-2 p-4">
          {!generated ? <Pill tone="muted">Rule-based</Pill> : null}
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{reply}</p>
        </Surface>
      ) : (
        <Surface className="p-4 text-sm text-muted-foreground">
          Ask anything about today, your week, or what to eat next. The coach
          reads your logged data.
        </Surface>
      )}
    </div>
  );
}
