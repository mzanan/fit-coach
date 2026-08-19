import "server-only";

import type { CoachResult, DaySummary } from "@/lib/ai/coach";
import type { CoachEvent } from "@/lib/ai/provider";
import type { PendingPreview } from "@/lib/data/coachPendingWrite";

export type CoachStreamEvent =
  | CoachEvent
  | {
      type: "done";
      text: string;
      generated: boolean;
      daySummary?: DaySummary;
      stopped?: boolean;
      learned?: string[];
    }
  | { type: "approval"; approvalId: string; previews: PendingPreview[] }
  | { type: "error" };

export function coachNdjsonResponse(
  run: (send: (event: CoachStreamEvent) => void) => Promise<CoachResult>,
  onDone?: (result: CoachResult) => void,
): Response {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: CoachStreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };
      send({ type: "status", tool: "thinking" });
      try {
        const result = await run(send);
        send(
          result.status === "pending"
            ? {
                type: "approval",
                approvalId: result.approvalId,
                previews: result.previews,
              }
            : {
                type: "done",
                text: result.text,
                generated: result.generated,
                daySummary: result.daySummary,
                stopped: result.stopped,
                learned: result.learned,
              },
        );
        onDone?.(result);
      } catch {
        send({ type: "error" });
      }
      if (!closed) {
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
