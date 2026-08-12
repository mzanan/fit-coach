"use client";

import { ChevronRight, Eraser, Sparkles, Square } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Collapse } from "@/components/ui/Collapse";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pill } from "@/components/ui/Pill";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";
import { DiningModeAsk } from "@/components/coach/DiningModeAsk";
import { EffortMenu } from "@/components/coach/EffortMenu";
import { ApprovalCard } from "@/components/coach/ApprovalCard";
import { LearnedChip } from "@/components/coach/LearnedChip";
import { MacroTable } from "@/components/coach/MacroTable";
import {
  useCoachChat,
  type ChatBubble,
  type PendingApproval,
} from "@/components/coach/useCoachChat";
import type { ReasoningEffort } from "@/lib/ai/options";
import type { CoachMessage } from "@/lib/data/coachMessages";

const QUICK = [
  "How am I doing today?",
  "What should I eat next?",
  "Is my fat too high?",
];

function Thoughts({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1 text-meta text-muted-foreground transition-colors duration-(--dur-fast) hover:text-foreground"
      >
        <ChevronRight
          className={cn(
            "size-3.5 transition-transform duration-(--dur-fast) ease-(--ease-out-soft)",
            open && "rotate-90",
          )}
          strokeWidth={1.5}
        />
        Thought process
      </button>
      <Collapse open={open}>
        <p className="mt-2 border-l border-input pl-3 text-meta whitespace-pre-wrap text-muted-foreground">
          {text}
        </p>
      </Collapse>
    </div>
  );
}

function Turn({ bubble }: { bubble: ChatBubble }) {
  if (bubble.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-control bg-well px-4 py-3">
          <p className="whitespace-pre-wrap text-body leading-relaxed">
            {bubble.content}
          </p>
        </div>
      </div>
    );
  }

  const stopped = bubble.status === "stopped";
  const isStreaming = bubble.status === "streaming";

  return (
    <div className="space-y-2">
      {!bubble.generated && !stopped && !isStreaming ? (
        <Pill tone="muted">Rule-based</Pill>
      ) : null}
      {bubble.reasoning ? <Thoughts text={bubble.reasoning} /> : null}
      <p
        className={cn(
          "whitespace-pre-wrap text-body leading-relaxed",
          stopped && "italic text-muted-foreground",
          isStreaming && "animate-pulse",
        )}
      >
        {bubble.content}
      </p>
      {bubble.daySummary ? <MacroTable summary={bubble.daySummary} /> : null}
      {bubble.learned?.length ? <LearnedChip facts={bubble.learned} /> : null}
    </div>
  );
}

export function CoachPanel({
  initial,
  effort,
  diningMode,
  pending,
  weekDays,
}: {
  initial: CoachMessage[];
  effort: ReasoningEffort | null;
  diningMode: string | null;
  pending: PendingApproval | null;
  weekDays: number | null;
}) {
  const { setAnchor, ...chat } = useCoachChat(initial, effort, pending);
  const weeklySummaryLabel =
    weekDays != null
      ? `Weekly summary (last ${weekDays} day${weekDays === 1 ? "" : "s"})`
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {diningMode ? null : <DiningModeAsk />}
      <div className="flex flex-wrap items-center gap-2">
        {weeklySummaryLabel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={chat.loading}
            onClick={() => void chat.askSummary()}
            className="text-muted-foreground hover:text-foreground"
          >
            {weeklySummaryLabel}
          </Button>
        ) : null}
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

      {chat.bubbles.length || chat.loading || chat.streaming || chat.pending ? (
        <div className="scroll-slim min-h-0 flex-1 space-y-8 overflow-y-auto pt-block pr-1">
          {chat.bubbles.map((bubble) => (
            <Turn key={bubble.id} bubble={bubble} />
          ))}
          {chat.reasoning ? <Thoughts text={chat.reasoning} /> : null}
          {chat.streaming ? (
            <p className="whitespace-pre-wrap text-body leading-relaxed">
              {chat.streaming}
            </p>
          ) : null}
          {chat.status ? (
            <p className="animate-pulse text-body text-muted-foreground">
              {chat.status}...
            </p>
          ) : null}
          {chat.pending ? (
            <ApprovalCard
              key={chat.pending.approvalId}
              previews={chat.pending.previews}
              busy={chat.loading}
              onDecide={(approved, itemId) =>
                void chat.decide(approved, itemId)
              }
            />
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
          className="rounded-control p-2 focus-within:border-ring"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void chat.ask();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={chat.question}
              onChange={(e) => chat.setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void chat.ask();
                }
              }}
              rows={1}
              placeholder="Write a message..."
              aria-label="Write a message"
              className="scroll-slim max-h-40 min-w-0 flex-1 resize-none self-center bg-transparent px-2.5 py-1.5 text-body outline-none field-sizing-content placeholder:text-faint"
            />
            {chat.effort ? (
              <EffortMenu
                effort={chat.effort}
                disabled={chat.loading}
                onChange={chat.setEffort}
              />
            ) : null}
            {chat.loading ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={chat.stop}
                className="shrink-0"
              >
                <Square className="size-4" strokeWidth={1.5} />
                Stop
              </Button>
            ) : (
              <Button type="submit" size="sm" className="shrink-0">
                <Sparkles className="size-4" strokeWidth={1.5} />
                Ask
              </Button>
            )}
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
