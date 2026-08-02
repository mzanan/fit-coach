"use client";

import { Eraser, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Pill";
import { StickyActions } from "@/components/ui/StickyActions";
import { Surface } from "@/components/ui/Surface";
import { useCoachChat, type ChatBubble } from "@/components/coach/useCoachChat";
import type { CoachMessage } from "@/lib/data/coachMessages";
import { cn } from "@/lib/utils";

const QUICK = [
  "How am I doing today?",
  "What should I eat next?",
  "Is my fat too high?",
];

function Bubble({ bubble }: { bubble: ChatBubble }) {
  const mine = bubble.role === "user";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <Surface
        level={mine ? "raised" : "sunken"}
        className={cn(
          "max-w-[85%] space-y-2 px-4 py-3",
          mine ? "rounded-control" : "rounded-control",
        )}
      >
        {!mine && !bubble.generated ? <Pill tone="muted">Rule-based</Pill> : null}
        <p className="whitespace-pre-wrap text-body leading-relaxed">
          {bubble.content}
        </p>
      </Surface>
    </div>
  );
}

export function CoachPanel({ initial }: { initial: CoachMessage[] }) {
  const { setAnchor, ...chat } = useCoachChat(initial);

  return (
    <div className="flex min-h-[calc(100dvh-var(--nav-h)-11rem)] flex-col gap-4">
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
        <div className="flex-1 space-y-3">
          {chat.bubbles.map((bubble) => (
            <Bubble key={bubble.id} bubble={bubble} />
          ))}
          {chat.loading ? (
            <div className="flex justify-start">
              <Surface level="sunken" className="px-4 py-3 text-body text-muted-foreground">
                Thinking...
              </Surface>
            </div>
          ) : null}
          <div ref={setAnchor} />
        </div>
      ) : (
        <Surface
          level="sunken"
          className="flex-1 p-5 text-body text-muted-foreground"
        >
          Ask anything about today, your week, or what to eat next. The coach
          reads your logged data and remembers this conversation.
        </Surface>
      )}

      <StickyActions className="bg-background">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void chat.ask();
          }}
          className="flex gap-2"
        >
          <Input
            value={chat.question}
            onChange={(e) => chat.setQuestion(e.target.value)}
            placeholder="Ask the coach"
          />
          <Button type="submit" disabled={chat.loading}>
            <Sparkles className="size-4" strokeWidth={1.5} />
            Ask
          </Button>
        </form>
      </StickyActions>

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
