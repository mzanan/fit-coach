import "server-only";

import { McpServer } from "@modelcontextprotocol/server";
import type { ToolSet } from "ai";

import { buildCoachTools } from "@/lib/ai/coachTools";
import { dayConfig, todayLogicalDay } from "@/lib/dates";
import { MCP_INSTRUCTIONS } from "@/lib/mcp/instructions";
import { toolResultText } from "@/lib/mcp/toolResult";
import { ensureProfile } from "@/lib/profile";

type CoachTool = ToolSet[string] & {
  execute?: (input: unknown, options: { toolCallId: string; messages: [] }) => Promise<unknown>;
};

export async function buildFitCoachServer(userId: string): Promise<McpServer> {
  const profile = await ensureProfile(userId);
  const today = todayLogicalDay(dayConfig(profile));
  const tools = buildCoachTools(userId, profile, today, true);
  const server = new McpServer(
    { name: "fit-coach", version: "1.0.0" },
    { instructions: MCP_INSTRUCTIONS },
  );

  for (const [name, entry] of Object.entries(tools)) {
    const tool = entry as CoachTool;
    const execute = tool.execute;
    if (!execute) continue;
    server.registerTool(
      name,
      {
        description: typeof tool.description === "string" ? tool.description : undefined,
        inputSchema: tool.inputSchema as never,
      },
      (async (input: unknown) => {
        const result = await execute(input ?? {}, {
          toolCallId: crypto.randomUUID(),
          messages: [],
        });
        return { content: [{ type: "text", text: toolResultText(result) }] };
      }) as never,
    );
  }

  return server;
}
