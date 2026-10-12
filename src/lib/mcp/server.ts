import "server-only";

import { McpServer } from "@modelcontextprotocol/server";
import type { ToolSet } from "ai";

import { buildCoachTools } from "@/lib/ai/coachTools";
import { dayConfig, todayLogicalDay } from "@/lib/dates";
import { registerHistoryTools } from "@/lib/mcp/historyTools";
import { withWriteLedger } from "@/lib/mcp/ledger";
import { registerManageTools } from "@/lib/mcp/manageTools";
import { registerMemoryTools } from "@/lib/mcp/memoryTools";
import { applyDuePlansFor } from "@/lib/data/plans";
import { MCP_INSTRUCTIONS } from "@/lib/mcp/instructions";
import { mcpToolDescription, toolTextContent } from "@/lib/mcp/toolResult";
import { ensureProfile } from "@/lib/profile";

type CoachTool = ToolSet[string] & {
  execute?: (input: unknown, options: { toolCallId: string; messages: [] }) => Promise<unknown>;
};

export async function buildFitCoachServer(userId: string): Promise<McpServer> {
  const profile = await ensureProfile(userId);
  const today = todayLogicalDay(dayConfig(profile));
  await applyDuePlansFor(userId, today);
  const tools = buildCoachTools(userId, profile, today, true);
  const server = withWriteLedger(
    new McpServer({ name: "fit-coach", version: "1.0.0" }, { instructions: MCP_INSTRUCTIONS }),
    userId,
  );

  for (const [name, entry] of Object.entries(tools)) {
    const tool = entry as CoachTool;
    const execute = tool.execute;
    if (!execute) continue;
    server.registerTool(
      name,
      {
        description: mcpToolDescription(tool.description),
        inputSchema: tool.inputSchema as never,
      },
      (async (input: unknown) => {
        const result = await execute(input ?? {}, {
          toolCallId: crypto.randomUUID(),
          messages: [],
        });
        return toolTextContent(result);
      }) as never,
    );
  }

  registerHistoryTools(server, userId, profile, today);
  registerManageTools(server, userId, profile, today);
  registerMemoryTools(server, userId, profile, today);

  return server;
}
