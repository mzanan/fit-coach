import "server-only";

import { after } from "next/server";

import { OPENROUTER_API } from "@/lib/ai/capabilities";
import { TOOL_GATE_TIMEOUT_MS } from "@/lib/ai/limits";
import { TOOL_GATE_ESCALATABLE } from "@/lib/constants";
import { logAiEvent } from "@/lib/data/aiEvents";
import {
  gateStatus,
  gateThresholds,
  humanApproved,
  latestUserText,
  parseJevVerdict,
  recentTurns,
  statusLabel,
  TOOL_GATE_POLICY,
  verdictLabel,
  withoutUserTexts,
  type GateMessage,
  type GateStatus,
  type GateThresholds,
  type GateVerdict,
} from "@/lib/ai/toolGateRules";

export interface ToolGateConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  thresholds: GateThresholds;
}

const DEFAULT_MODEL = "typesafe/jev-1.13";

export function toolGateConfig(): ToolGateConfig | null {
  const apiKey = process.env.JEV_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.JEV_BASE_URL?.trim() || OPENROUTER_API).replace(/\/+$/, ""),
    model: process.env.JEV_MODEL?.trim() || DEFAULT_MODEL,
    thresholds: gateThresholds(process.env),
  };
}

async function askJev(
  config: ToolGateConfig,
  toolName: string,
  input: unknown,
  messages: GateMessage[],
): Promise<GateVerdict | null> {
  try {
    const response = await fetch(`${config.baseUrl}/systemone`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        state: {
          recent_conversation: recentTurns(messages),
          user_latest_message: latestUserText(messages),
          proposed_tool_call: { tool: toolName, input },
        },
        questions: {
          decision: {
            type: "choice",
            instructions:
              "A nutrition coach assistant wants to save this for the user. Decide whether it is saved now, the user confirms it first, or it is refused.",
            criteria: TOOL_GATE_POLICY,
          },
        },
      }),
      signal: AbortSignal.timeout(TOOL_GATE_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn(`coach: tool gate unavailable, status ${response.status}`);
      return null;
    }
    return parseJevVerdict(await response.json());
  } catch (err) {
    console.warn("coach: tool gate unavailable", err);
    return null;
  }
}

function logGateEvent(userId: string, model: string, detail: string): void {
  try {
    after(() => logAiEvent(userId, "tool_gate", { model, detail }));
  } catch (err) {
    console.warn("coach: tool gate event not logged", err);
  }
}

export function toolGateApprovals(
  config: ToolGateConfig,
  userId: string,
  toolNames: readonly string[],
  syntheticUserTexts: readonly string[] = [],
) {
  return Object.fromEntries(
    toolNames.map((toolName) => [
      toolName,
      async (
        input: unknown,
        options: { toolCallId: string; messages: GateMessage[] },
      ): Promise<GateStatus> => {
        if (humanApproved(options.messages, options.toolCallId)) return "not-applicable";
        const verdict = await askJev(
          config,
          toolName,
          input,
          withoutUserTexts(options.messages, syntheticUserTexts),
        );
        const status = gateStatus(verdict, config.thresholds, TOOL_GATE_ESCALATABLE.has(toolName));
        const outcome = verdict ? statusLabel(status) : "unavailable";
        const detail = `${toolName} ${outcome}${verdict ? ` ${verdictLabel(verdict)}` : ""}`;
        console.info(`coach: tool gate ${detail}`);
        if (outcome !== "approved") logGateEvent(userId, config.model, detail);
        return status;
      },
    ]),
  );
}
