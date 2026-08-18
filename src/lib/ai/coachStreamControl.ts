import "server-only";

import { getExchangeStatus, updateExchangeContent, type ExchangeRef } from "@/lib/data/coachMessages";
import type { CoachEvent } from "@/lib/ai/provider";

const STOP_POLL_MS = 1000;
const CONTENT_FLUSH_MS = 1000;

export function watchForStop(
  ref: ExchangeRef,
  controller: AbortController,
): () => void {
  const interval = setInterval(() => {
    if (controller.signal.aborted) return;
    getExchangeStatus(ref)
      .then((status) => {
        if (status === "stopped") controller.abort();
      })
      .catch(() => {});
  }, STOP_POLL_MS);
  return () => clearInterval(interval);
}

export function bufferedOnEvent(
  ref: ExchangeRef,
  forward: (event: CoachEvent) => void,
): {
  onEvent: (event: CoachEvent) => void;
  buffer: () => string;
  drain: () => Promise<void>;
} {
  let text = "";
  let lastFlush = 0;
  let inFlight: Promise<void> = Promise.resolve();
  return {
    onEvent(event) {
      if (event.type === "delta") {
        text += event.text;
        const now = Date.now();
        if (now - lastFlush >= CONTENT_FLUSH_MS) {
          lastFlush = now;
          const snapshot = text;
          inFlight = inFlight.then(() =>
            updateExchangeContent(ref, snapshot).catch(() => {}),
          );
        }
      }
      forward(event);
    },
    buffer: () => text,
    drain: () => inFlight,
  };
}
