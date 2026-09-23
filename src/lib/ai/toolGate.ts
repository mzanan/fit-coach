import "server-only";

import { after } from "next/server";

import { TOOL_GATE_ESCALATABLE, TOOL_GATE_TIMEOUT_MS } from "@/lib/constants";
import { logAiEvent } from "@/lib/data/aiEvents";
import {
  gateStatus,
  gateThresholds,
  humanApproved,
  latestUserText,
  parseJevVerdict,
  TOOL_GATE_POLICY,
  type GateMessage,
  type GateStatus,
  type GateThresholds,
  type GateVerdict,
} from "@/lib/toolGate";

export interface ToolGateConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  thresholds: GateThresholds;
}

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "typesafe/jev-1.13";

export function toolGateConfig(): ToolGateConfig | null {
  const apiKey = process.env.JEV_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.JEV_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    model: process.env.JEV_MODEL?.trim() || DEFAULT_MODEL,
    thresholds: gateThresholds(process.env),
  };
}

async function askJev(
  config: ToolGateConfig,
  toolName: string,
  input: unknown,
  userText: string,
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
          user_latest_message: userText,
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
      console.warn(`coach: write gate unavailable, status ${response.status}`);
      return null;
    }
    return parseJevVerdict(await response.json());
  } catch (err) {
    console.warn("coach: write gate unavailable", err);
    return null;
  }
}

function describe(status: GateStatus): string {
  return typeof status === "string" ? status : status.type;
}

export function toolGateApprovals(
  config: ToolGateConfig,
  userId: string,
  toolNames: readonly string[],
) {
  return Object.fromEntries(
    toolNames.map((toolName) => [
      toolName,
      async (
        input: unknown,
        options: { toolCallId: string; messages: GateMessage[] },
      ): Promise<GateStatus> => {
        if (humanApproved(options.messages, options.toolCallId)) return "not-applicable";
        const verdict = await askJev(config, toolName, input, latestUserText(options.messages));
        const status = gateStatus(verdict, config.thresholds, TOOL_GATE_ESCALATABLE.has(toolName));
        const outcome = verdict ? describe(status) : "unavailable";
        console.info(
          `coach: write gate ${toolName} -> ${outcome}${verdict ? ` (${verdict.decision} p=${verdict.probabilities[verdict.decision].toFixed(2)})` : ""}`,
        );
        if (outcome !== "approved") {
          after(() =>
            logAiEvent(userId, "write_gate", {
              model: config.model,
              detail: `${toolName} ${outcome}${verdict ? ` ${verdict.decision} p=${verdict.probabilities[verdict.decision].toFixed(2)}` : ""}`,
            }),
          );
        }
        return status;
      },
    ]),
  );
}
