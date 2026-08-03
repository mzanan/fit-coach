import "server-only";

import type { CoachResult } from "@/lib/ai/coach";
import type { CoachEvent } from "@/lib/ai/provider";
import type { PendingPreview } from "@/lib/data/coachPendingWrite";

export type CoachStreamEvent =
  | CoachEvent
  | { type: "done"; text: string; generated: boolean }
  | { type: "approval"; approvalId: string; previews: PendingPreview[] }
  | { type: "error" };

export function coachNdjsonResponse(
  run: (send: (event: CoachStreamEvent) => void) => Promise<CoachResult>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: CoachStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
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
            : { type: "done", text: result.text, generated: result.generated },
        );
      } catch {
        send({ type: "error" });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
