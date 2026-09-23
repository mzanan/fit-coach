export type GateDecision = "approve" | "escalate" | "deny";

export const GATE_DECISIONS: readonly GateDecision[] = ["approve", "escalate", "deny"];

export interface GateVerdict {
  decision: GateDecision;
  probabilities: Record<GateDecision, number>;
}

export interface GateThresholds {
  approveMin: number;
  denyMin: number;
}

export type GateStatus =
  | "not-applicable"
  | "user-approval"
  | { type: "approved"; reason: string }
  | { type: "denied"; reason: string };

export interface GateMessage {
  role: string;
  content: unknown;
}

export interface GateTurn {
  role: "user" | "assistant";
  text: string;
}

export const DEFAULT_GATE_THRESHOLDS: GateThresholds = { approveMin: 0.7, denyMin: 0.7 };

export const TOOL_GATE_POLICY: Record<GateDecision, string> = {
  approve:
    "In the conversation, the user asks to record exactly this, either in their latest message or by answering the assistant's last question (a short reply such as a number, a choice or a yes completes what the assistant asked): a meal they ate (a catalog item by id, or a food not in the catalog whose macros the assistant estimated, which is expected), fatigue, a workout session, a body measurement, or a standing rule the user wants applied from now on (always, every day, from now on). The food, category, portions and values match what the user said.",
  escalate:
    "The user asked to record this, but a value is ambiguous or implausible for what they described (a portion count far from what they said, a measurement far outside a normal human range), so the user should confirm it before it is saved.",
  deny:
    "The user did not ask to record this: they asked a question, asked for advice, or asked for something else. A correction or description of one meal is not a standing rule. Or a value contradicts what the user said: a different food, a different meal category, a different number.",
};

export const GATE_DENIED_REASON =
  "Refused by the tool gate: this does not match what the user asked. Do not retry the same call; tell the user what you were about to save and ask them.";

function isDecision(value: unknown): value is GateDecision {
  return typeof value === "string" && (GATE_DECISIONS as readonly string[]).includes(value);
}

export function parseJevVerdict(data: unknown): GateVerdict | null {
  const answer = (data as { answers?: { decision?: unknown } } | null)?.answers?.decision as
    | { choice?: unknown; probabilities?: Record<string, unknown> }
    | undefined;
  if (!answer || !isDecision(answer.choice)) return null;
  const probabilities = {} as Record<GateDecision, number>;
  for (const decision of GATE_DECISIONS) {
    const value = answer.probabilities?.[decision];
    probabilities[decision] = typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
  return { decision: answer.choice, probabilities };
}

export function verdictLabel(verdict: GateVerdict): string {
  return `${verdict.decision} p=${verdict.probabilities[verdict.decision].toFixed(2)}`;
}

export function statusLabel(status: GateStatus): string {
  return typeof status === "string" ? status : status.type;
}

export function gateStatus(
  verdict: GateVerdict | null,
  thresholds: GateThresholds,
  canEscalate: boolean,
): GateStatus {
  if (!verdict) return "not-applicable";
  const confidence = verdict.probabilities[verdict.decision];
  if (verdict.decision === "approve" && confidence >= thresholds.approveMin) {
    return { type: "approved", reason: `tool gate approved (${verdictLabel(verdict)})` };
  }
  if (verdict.decision === "deny" && confidence >= thresholds.denyMin) {
    return { type: "denied", reason: GATE_DENIED_REASON };
  }
  return canEscalate ? "user-approval" : "not-applicable";
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) =>
      part && typeof part === "object" && "type" in part && part.type === "text" && "text" in part
        ? String(part.text)
        : "",
    )
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function recentTurns(
  messages: readonly GateMessage[],
  maxTurns = 6,
  maxChars = 400,
): GateTurn[] {
  const turns: GateTurn[] = [];
  for (let i = messages.length - 1; i >= 0 && turns.length < maxTurns; i -= 1) {
    const { role } = messages[i];
    if (role !== "user" && role !== "assistant") continue;
    const text = textOf(messages[i].content);
    if (text) turns.push({ role, text: text.length > maxChars ? text.slice(-maxChars) : text });
  }
  return turns.reverse();
}

export function withoutUserTexts(
  messages: readonly GateMessage[],
  ignored: readonly string[],
): GateMessage[] {
  if (!ignored.length) return [...messages];
  return messages.filter(
    (message) => !(message.role === "user" && ignored.includes(textOf(message.content))),
  );
}

export function latestUserText(messages: readonly GateMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role !== "user") continue;
    const text = textOf(messages[i].content);
    if (text) return text;
  }
  return "";
}

function partsOf(message: GateMessage): Record<string, unknown>[] {
  return Array.isArray(message.content)
    ? message.content.filter((part): part is Record<string, unknown> => Boolean(part) && typeof part === "object")
    : [];
}

export function humanApproved(messages: readonly GateMessage[], toolCallId: string): boolean {
  const requested = new Set<string>();
  for (const message of messages) {
    for (const part of partsOf(message)) {
      if (
        part.type === "tool-approval-request" &&
        part.toolCallId === toolCallId &&
        part.isAutomatic !== true &&
        typeof part.approvalId === "string"
      ) {
        requested.add(part.approvalId);
      }
    }
  }
  if (!requested.size) return false;
  return messages.some((message) =>
    partsOf(message).some(
      (part) =>
        part.type === "tool-approval-response" &&
        part.approved === true &&
        typeof part.approvalId === "string" &&
        requested.has(part.approvalId),
    ),
  );
}

function threshold(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
}

export function gateThresholds(env: Record<string, string | undefined>): GateThresholds {
  return {
    approveMin: threshold(env.JEV_APPROVE_MIN, DEFAULT_GATE_THRESHOLDS.approveMin),
    denyMin: threshold(env.JEV_DENY_MIN, DEFAULT_GATE_THRESHOLDS.denyMin),
  };
}
