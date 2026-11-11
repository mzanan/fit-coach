import { describe, expect, it } from "vitest";

import {
  DEFAULT_GATE_THRESHOLDS,
  GATE_DENIED_REASON,
  gateStatus,
  gateThresholds,
  humanApproved,
  latestUserText,
  parseJevVerdict,
  recentTurns,
  withoutUserTexts,
  type GateVerdict,
} from "@/lib/ai/toolGateRules";

function verdict(decision: GateVerdict["decision"], p: number): GateVerdict {
  const rest = (1 - p) / 2;
  return {
    decision,
    probabilities: {
      approve: decision === "approve" ? p : rest,
      escalate: decision === "escalate" ? p : rest,
      deny: decision === "deny" ? p : rest,
    },
  };
}

describe("parseJevVerdict", () => {
  it("reads the choice and fills every probability", () => {
    const parsed = parseJevVerdict({
      answers: { decision: { type: "choice", choice: "deny", probabilities: { deny: 0.9, approve: 0.1 } } },
    });
    expect(parsed).toEqual({ decision: "deny", probabilities: { approve: 0.1, escalate: 0, deny: 0.9 } });
  });

  it("returns null for an unknown choice or a malformed body", () => {
    expect(parseJevVerdict({ answers: { decision: { choice: "maybe" } } })).toBeNull();
    expect(parseJevVerdict({ error: { message: "402" } })).toBeNull();
    expect(parseJevVerdict(null)).toBeNull();
  });

  it("ignores non-numeric probabilities", () => {
    const parsed = parseJevVerdict({
      answers: { decision: { choice: "approve", probabilities: { approve: "0.9", deny: Number.NaN } } },
    });
    expect(parsed?.probabilities).toEqual({ approve: 0, escalate: 0, deny: 0 });
  });
});

describe("gateStatus", () => {
  const t = DEFAULT_GATE_THRESHOLDS;

  it("fails open when the gate has no verdict", () => {
    expect(gateStatus(null, t, true)).toBe("not-applicable");
  });

  it("approves a confident approve", () => {
    expect(gateStatus(verdict("approve", 0.86), t, true)).toEqual({
      type: "approved",
      reason: "tool gate approved (approve p=0.86)",
    });
  });

  it("refuses a confident deny with a reason the model can act on", () => {
    expect(gateStatus(verdict("deny", 0.94), t, true)).toEqual({ type: "denied", reason: GATE_DENIED_REASON });
  });

  it("sends escalations and low-confidence verdicts to the card when the tool has one", () => {
    expect(gateStatus(verdict("escalate", 0.95), t, true)).toBe("user-approval");
    expect(gateStatus(verdict("approve", 0.6), t, true)).toBe("user-approval");
    expect(gateStatus(verdict("deny", 0.55), t, true)).toBe("user-approval");
  });

  it("lets the write run as before when the tool has no card", () => {
    expect(gateStatus(verdict("escalate", 0.95), t, false)).toBe("not-applicable");
    expect(gateStatus(verdict("approve", 0.6), t, false)).toBe("not-applicable");
  });

  it("still refuses a confident deny on a tool without a card", () => {
    expect(gateStatus(verdict("deny", 0.94), t, false)).toEqual({ type: "denied", reason: GATE_DENIED_REASON });
  });

  it("treats the threshold as inclusive", () => {
    expect(gateStatus(verdict("approve", 0.7), t, true)).toEqual({
      type: "approved",
      reason: "tool gate approved (approve p=0.70)",
    });
  });
});

describe("latestUserText", () => {
  it("returns the last user message with text, joining text parts", () => {
    expect(
      latestUserText([
        { role: "user", content: "first" },
        { role: "assistant", content: "ok" },
        { role: "user", content: [{ type: "text", text: "almorcé" }, { type: "image", image: "x" }, { type: "text", text: "pollo avo" }] },
        { role: "tool", content: [{ type: "tool-result" }] },
      ]),
    ).toBe("almorcé pollo avo");
  });

  it("skips a trailing user message with no text", () => {
    expect(
      latestUserText([
        { role: "user", content: "cené bep an" },
        { role: "user", content: [{ type: "image", image: "x" }] },
      ]),
    ).toBe("cené bep an");
  });

  it("returns an empty string when there is no user text", () => {
    expect(latestUserText([{ role: "assistant", content: "hi" }])).toBe("");
  });
});

describe("gateThresholds", () => {
  it("defaults when unset or blank", () => {
    expect(gateThresholds({})).toEqual(DEFAULT_GATE_THRESHOLDS);
    expect(gateThresholds({ JEV_APPROVE_MIN: " ", JEV_DENY_MIN: "" })).toEqual(DEFAULT_GATE_THRESHOLDS);
  });

  it("reads valid values and rejects out-of-range ones", () => {
    expect(gateThresholds({ JEV_APPROVE_MIN: "0.5", JEV_DENY_MIN: "0.9" })).toEqual({ approveMin: 0.5, denyMin: 0.9 });
    expect(gateThresholds({ JEV_APPROVE_MIN: "1.5", JEV_DENY_MIN: "abc" })).toEqual(DEFAULT_GATE_THRESHOLDS);
  });
});

describe("humanApproved", () => {
  const request = (toolCallId: string, approvalId: string, isAutomatic?: boolean) => ({
    role: "assistant",
    content: [
      { type: "tool-call", toolCallId, toolName: "update_rule", input: {} },
      { type: "tool-approval-request", approvalId, toolCallId, ...(isAutomatic ? { isAutomatic } : {}) },
    ],
  });
  const response = (approvalId: string, approved: boolean) => ({
    role: "tool",
    content: [{ type: "tool-approval-response", approvalId, approved }],
  });

  it("is true once the user approved the card for this call", () => {
    expect(humanApproved([request("call-1", "ap-1"), response("ap-1", true)], "call-1")).toBe(true);
  });

  it("is false for a rejected card, another call, or no card at all", () => {
    expect(humanApproved([request("call-1", "ap-1"), response("ap-1", false)], "call-1")).toBe(false);
    expect(humanApproved([request("call-1", "ap-1"), response("ap-1", true)], "call-2")).toBe(false);
    expect(humanApproved([{ role: "user", content: "hola" }], "call-1")).toBe(false);
  });

  it("does not count an automatic approval as a human one", () => {
    expect(humanApproved([request("call-1", "ap-1", true), response("ap-1", true)], "call-1")).toBe(false);
  });
});

describe("recentTurns", () => {
  it("keeps user and assistant text in order and drops tool traffic", () => {
    expect(
      recentTurns([
        { role: "user", content: "hoy estoy muy cansado" },
        { role: "assistant", content: [{ type: "text", text: "¿Qué nivel de energía del 1 al 10?" }] },
        { role: "tool", content: [{ type: "tool-result" }] },
        { role: "user", content: "3" },
      ]),
    ).toEqual([
      { role: "user", text: "hoy estoy muy cansado" },
      { role: "assistant", text: "¿Qué nivel de energía del 1 al 10?" },
      { role: "user", text: "3" },
    ]);
  });

  it("keeps only the last turns and truncates long ones", () => {
    const messages = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `m${i}` }));
    expect(recentTurns(messages, 3).map((t) => t.text)).toEqual(["m7", "m8", "m9"]);
    const long = `${"x".repeat(800)}¿Qué nivel de energía del 1 al 10?`;
    const kept = recentTurns([{ role: "assistant", content: long }], 6, 400)[0].text;
    expect(kept).toHaveLength(400);
    expect(kept.endsWith("¿Qué nivel de energía del 1 al 10?")).toBe(true);
  });
});

describe("withoutUserTexts", () => {
  it("drops synthetic user turns so the real request stays the latest", () => {
    const messages = [
      { role: "user", content: "cené bep an" },
      { role: "assistant", content: "Anotando" },
      { role: "user", content: "Continue the answer" },
    ];
    const cleaned = withoutUserTexts(messages, ["Continue the answer"]);
    expect(latestUserText(cleaned)).toBe("cené bep an");
    expect(withoutUserTexts(messages, [])).toEqual(messages);
  });
});
