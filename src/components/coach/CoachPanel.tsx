"use client";

import { Eraser, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pill } from "@/components/ui/Pill";
import { Surface } from "@/components/ui/Surface";
import { useCoachChat, type ChatBubble } from "@/components/coach/useCoachChat";
import type { CoachMessage } from "@/lib/data/coachMessages";

const QUICK = [
  "How am I doing today?",
  "What should I eat next?",
  "Is my fat too high?",
];

function Turn({ bubble }: { bubble: ChatBubble }) {
  if (bubble.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-well px-4 py-3">
          <p className="whitespace-pre-wrap text-body leading-relaxed">
            {bubble.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bubble.generated ? null : <Pill tone="muted">Rule-based</Pill>}
      <p className="whitespace-pre-wrap text-body leading-relaxed">
        {bubble.content}
      </p>
    </div>
  );
}

export function CoachPanel({ initial }: { initial: CoachMessage[] }) {
  const { setAnchor, ...chat } = useCoachChat(initial);

  return (
    <div className="flex h-[calc(100dvh-var(--nav-h)-9rem)] flex-col overflow-hidden md:h-[calc(100dvh-11rem)]">
      <div className="flex flex-wrap items-center gap-2">
        {QUICK.map((q) => (
          <Button
            key={q}
            type="button"
            variant="outline"
            size="sm"
            disabled={chat.loading}
            onClick={() => void chat.ask(q)}
            className="text-muted-foreground hover:text-foreground"
          >
            {q}
          </Button>
        ))}
        {chat.bubbles.length ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={chat.loading}
            onClick={() => chat.setConfirmOpen(true)}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <Eraser className="size-4" strokeWidth={1.5} />
            Clear
          </Button>
        ) : null}
      </div>

      {chat.bubbles.length || chat.loading ? (
        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto pt-block">
          {chat.bubbles.map((bubble) => (
            <Turn key={bubble.id} bubble={bubble} />
          ))}
          {chat.loading ? (
            <p className="text-body text-muted-foreground">Thinking...</p>
          ) : null}
          <div ref={setAnchor} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center py-block">
          <p className="max-w-[38ch] text-center text-body text-muted-foreground">
            Ask anything about today, your week, or what to eat next. The coach
            reads your logged data and remembers this conversation.
          </p>
        </div>
      )}

      <div className="shrink-0 bg-background pt-3">
        <Surface
          level="raised"
          className="rounded-2xl p-2 focus-within:border-ring"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void chat.ask();
            }}
          >
            <input
              value={chat.question}
              onChange={(e) => chat.setQuestion(e.target.value)}
              placeholder="Write a message..."
              aria-label="Write a message"
              className="w-full bg-transparent px-2.5 pt-2 pb-3 text-body outline-none placeholder:text-faint"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={chat.loading}>
                <Sparkles className="size-4" strokeWidth={1.5} />
                Ask
              </Button>
            </div>
          </form>
        </Surface>
      </div>

      <ConfirmDialog
        open={chat.confirmOpen}
        onOpenChange={chat.setConfirmOpen}
        title="Clear this conversation?"
        body="The messages are deleted. What the coach learned about you stays."
        confirmLabel="Clear"
        tone="destructive"
        onConfirm={chat.clear}
      />
    </div>
  );
}
