import type { DaySummary } from "@/lib/ai/coach";
import { COACH_MAX_DURATION_SECONDS } from "@/lib/constants";
import type {
  CoachMessage,
  CoachMessageStatus,
} from "@/lib/data/coachMessages";

export interface ChatBubble {
  id: string;
  role: "user" | "assistant";
  content: string;
  generated: boolean;
  status: CoachMessageStatus;
  reasoning?: string;
  daySummary?: DaySummary;
  learned?: string[];
}

const MAX_FUNCTION_DURATION_MS = (COACH_MAX_DURATION_SECONDS + 30) * 1000;

export function isStaleStream(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > MAX_FUNCTION_DURATION_MS;
}

export function toBubbles(messages: CoachMessage[]): ChatBubble[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    generated: message.generated,
    status:
      message.status === "streaming" && isStaleStream(message.created_at)
        ? "stopped"
        : message.status,
    daySummary: message.daySummary,
    learned: message.learned,
  }));
}

export function localBubble(role: "user" | "assistant", content: string): ChatBubble {
  return {
    id: `local-${Date.now()}-${role}`,
    role,
    content,
    generated: true,
    status: "done",
  };
}
