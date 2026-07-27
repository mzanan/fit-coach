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
          <Button
            key={q}
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => ask(q)}
            className="text-muted-foreground hover:text-foreground"
          >
            {q}
          </Button>
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
        <Button
          type="submit"
          disabled={loading}
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          <Sparkles className="size-4" strokeWidth={1.5} />
          Ask
        </Button>
      </form>

      {loading ? (
        <Surface className="p-5 text-body text-muted-foreground">Thinking...</Surface>
      ) : reply ? (
        <Surface className="space-y-2.5 p-5">
          {!generated ? <Pill tone="muted">Rule-based</Pill> : null}
          <p className="whitespace-pre-wrap text-body leading-relaxed">{reply}</p>
        </Surface>
      ) : (
        <Surface level="sunken" className="p-5 text-body text-muted-foreground">
          Ask anything about today, your week, or what to eat next. The coach
          reads your logged data.
        </Surface>
      )}
    </div>
  );
}
