import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { LedgerKeyError, runLedgered } from "@/lib/data/writeLedger";
import { isWriteTool } from "@/lib/toolKinds";
import { isFailedToolResult, toolError } from "@/lib/mcp/toolResult";

type ToolResult = { isError?: boolean; content?: { type: string; text?: string }[] };
type ToolHandler = (input: unknown, extra: unknown) => Promise<ToolResult>;
type ToolConfig = { inputSchema?: unknown } & Record<string, unknown>;

const idempotencyKey = z
  .string()
  .min(1)
  .max(200)
  .optional()
  .describe(
    "Optional. A key unique to this write (for example md:2026-09-23:lunch:1). Repeating a call with the same key returns the first result instead of writing twice.",
  );

function withKey(schema: unknown): unknown {
  return schema instanceof z.ZodObject ? schema.extend({ idempotency_key: idempotencyKey }) : schema;
}

function splitKey(input: unknown): { key?: string; rest: unknown } {
  if (!input || typeof input !== "object") return { rest: input ?? {} };
  const { idempotency_key: key, ...rest } = input as Record<string, unknown>;
  return { key: typeof key === "string" ? key : undefined, rest };
}

function isListAction(input: unknown): boolean {
  return Boolean(input && typeof input === "object" && (input as { action?: unknown }).action === "list");
}

export function withWriteLedger(server: McpServer, userId: string): McpServer {
  const register = server.registerTool.bind(server) as (name: string, config: ToolConfig, handler: ToolHandler) => unknown;

  server.registerTool = ((name: string, config: ToolConfig, handler: ToolHandler) => {
    if (!isWriteTool(name)) return register(name, config, handler);
    return register(name, { ...config, inputSchema: withKey(config.inputSchema) }, async (input, extra) => {
      const { key, rest } = splitKey(input);
      if (isListAction(rest)) return handler(rest, extra);
      try {
        const outcome = await runLedgered(
          { userId, source: "mcp", tool: name, input: rest, idempotencyKey: key },
          () => handler(rest, extra),
          isFailedToolResult,
        );
        return (outcome.replayed ? outcome.receipt : outcome.result) as ToolResult;
      } catch (error) {
        if (error instanceof LedgerKeyError) return toolError(error.message);
        throw error;
      }
    });
  }) as unknown as McpServer["registerTool"];

  return server;
}
