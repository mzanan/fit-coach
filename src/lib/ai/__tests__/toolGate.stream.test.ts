import { isStepCount, streamText, tool, type ModelMessage } from "ai";
import { convertArrayToReadableStream, MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));
vi.mock("@/lib/data/aiEvents", () => ({ logAiEvent: vi.fn(async () => undefined) }));

const { toolGateApprovals, toolGateConfig } = await import("@/lib/ai/toolGate");

const USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

const MEAL_INPUT = { item_id: "ci_83f2", item_name: "Pollo Avo", category: "lunch", portions: 1 };

function mockModel(toolCallFirst: boolean) {
  let call = toolCallFirst ? 0 : 1;
  return new MockLanguageModelV4({
    doStream: async () => {
      call += 1;
      const chunks =
        call === 1
          ? [
              { type: "stream-start", warnings: [] },
              { type: "tool-call", toolCallId: "call-1", toolName: "log_meal", input: JSON.stringify(MEAL_INPUT) },
              { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage: USAGE },
            ]
          : [
              { type: "stream-start", warnings: [] },
              { type: "text-start", id: "t1" },
              { type: "text-delta", id: "t1", delta: "Done." },
              { type: "text-end", id: "t1" },
              { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage: USAGE },
            ];
      return { stream: convertArrayToReadableStream(chunks as never[]) };
    },
  });
}

function jevAnswers(choice: string, p: number) {
  return vi.fn(async () =>
    new Response(
      JSON.stringify({ answers: { decision: { type: "choice", choice, probabilities: { [choice]: p } } } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
}

async function run(messages: ModelMessage[], toolCallFirst = true) {
  const executed: unknown[] = [];
  const config = toolGateConfig();
  if (!config) throw new Error("gate config missing");
  const result = streamText({
    model: mockModel(toolCallFirst),
    messages,
    tools: {
      log_meal: tool({
        inputSchema: z.object({
          item_id: z.string(),
          item_name: z.string(),
          category: z.string(),
          portions: z.number(),
        }),
        execute: async (input) => {
          executed.push(input);
          return { logged: true };
        },
      }),
    },
    toolApproval: toolGateApprovals(config, "user-1", ["log_meal"]),
    stopWhen: isStepCount(3),
  });
  const parts: { type: string; isAutomatic?: boolean; approved?: boolean }[] = [];
  for await (const part of result.fullStream) {
    parts.push(part as { type: string; isAutomatic?: boolean; approved?: boolean });
  }
  const cards = parts.filter((p) => p.type === "tool-approval-request" && !p.isAutomatic);
  const denied = parts.filter((p) => p.type === "tool-approval-response" && p.approved === false);
  return { executed, cards, denied };
}

const USER: ModelMessage[] = [{ role: "user", content: "almorcé pollo avo" }];

describe("tool gate inside a real streamText loop", () => {
  beforeEach(() => {
    vi.stubEnv("JEV_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("runs a confident approve without showing a card", async () => {
    vi.stubGlobal("fetch", jevAnswers("approve", 0.9));
    const { executed, cards, denied } = await run(USER);
    expect(executed).toHaveLength(1);
    expect(cards).toHaveLength(0);
    expect(denied).toHaveLength(0);
  });

  it("sends the recent conversation so a short answer keeps its context", async () => {
    const fetchSpy = jevAnswers("approve", 0.9);
    vi.stubGlobal("fetch", fetchSpy);
    await run([
      { role: "user", content: "almorcé algo del catálogo" },
      { role: "assistant", content: "¿Pollo Avo, una porción?" },
      { role: "user", content: "sí" },
    ]);
    const init = (fetchSpy.mock.calls as unknown[][])[0][1] as { body: string };
    const body = JSON.parse(init.body) as { state: { recent_conversation: unknown; user_latest_message: string } };
    expect(body.state.user_latest_message).toBe("sí");
    expect(body.state.recent_conversation).toEqual([
      { role: "user", text: "almorcé algo del catálogo" },
      { role: "assistant", text: "¿Pollo Avo, una porción?" },
      { role: "user", text: "sí" },
    ]);
  });

  it("refuses a confident deny without running it or showing a card", async () => {
    vi.stubGlobal("fetch", jevAnswers("deny", 0.95));
    const { executed, cards, denied } = await run(USER);
    expect(executed).toHaveLength(0);
    expect(cards).toHaveLength(0);
    expect(denied).toHaveLength(1);
  });

  it("shows a card for an escalation and does not run it", async () => {
    vi.stubGlobal("fetch", jevAnswers("escalate", 0.9));
    const { executed, cards } = await run(USER);
    expect(executed).toHaveLength(0);
    expect(cards).toHaveLength(1);
  });

  it("fails open when Jev is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));
    const { executed, cards, denied } = await run(USER);
    expect(executed).toHaveLength(1);
    expect(cards).toHaveLength(0);
    expect(denied).toHaveLength(0);
  });

  it("runs a card the user approved without asking Jev again", async () => {
    const fetchSpy = jevAnswers("deny", 0.99);
    vi.stubGlobal("fetch", fetchSpy);
    const { executed, cards } = await run([
      ...USER,
      {
        role: "assistant",
        content: [
          { type: "tool-call", toolCallId: "call-1", toolName: "log_meal", input: MEAL_INPUT },
          { type: "tool-approval-request", approvalId: "ap-1", toolCallId: "call-1" },
        ],
      },
      { role: "tool", content: [{ type: "tool-approval-response", approvalId: "ap-1", approved: true }] },
    ], false);
    expect(executed).toHaveLength(1);
    expect(cards).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
