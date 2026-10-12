import "server-only";

import type { ToolSet } from "ai";

import { runLedgered } from "@/lib/data/writeLedger";
import { isWriteTool } from "@/lib/toolKinds";

type Execute = (input: unknown, options: unknown) => Promise<unknown>;

export function withCoachLedger(tools: ToolSet, userId: string): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([name, entry]) => {
      const execute = (entry as { execute?: Execute }).execute;
      if (!execute || !isWriteTool(name)) return [name, entry];
      const ledgered: Execute = async (input, options) => {
        const outcome = await runLedgered({ userId, source: "coach", tool: name, input }, () => execute(input, options));
        return outcome.replayed ? outcome.receipt : outcome.result;
      };
      return [name, { ...entry, execute: ledgered }];
    }),
  ) as ToolSet;
}
