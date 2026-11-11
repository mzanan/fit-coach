import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { replaceDay } from "@/lib/data/dayReplace";
import { listPlans, savePlan } from "@/lib/data/plans";
import { getCurrentRoutine, listRoutineVersions, replaceRoutine } from "@/lib/data/routineVersions";
import type { Profile } from "@/lib/db/schema";
import {
  planInput,
  replaceDayInput,
  routineInput,
} from "@/lib/history/schemas";
import { futureDayError, toolTextContent } from "@/lib/mcp/toolResult";

const APP_PATHS = ["/", "/workout", "/routine", "/body", "/coach", "/settings", "/settings/targets"];

function refreshApp() {
  for (const path of APP_PATHS) revalidatePath(path);
}

export function registerHistoryTools(
  server: McpServer,
  userId: string,
  profile: Profile,
  today: string,
) {
  server.registerTool(
    "replace_day",
    {
      description:
        "Rewrite one whole day in a single step: every meal logged that day is replaced by the given list (pass place, fat_quality and catalog_item_id back unchanged for meals you keep), the day type is set, and when a workout is given that day's gym session is replaced (pass notes and is_pr back for sets you keep). Safe to repeat with the same data. Use it to load history from older notes, oldest day first, and to correct a day. Read the day with get_day first unless the user gave you its full list. Not for future days.",
      inputSchema: replaceDayInput,
    },
    async (input) => {
      const future = futureDayError(input.day, today);
      if (future) return future;
      const result = await replaceDay(userId, input);
      refreshApp();
      return toolTextContent({ saved: true, day: input.day, ...result });
    },
  );

  server.registerTool(
    "set_plan",
    {
      description:
        "Record a nutrition phase change: phase name, daily calorie surplus or deficit, the 8 daily targets, what was decided, why, from which logical day and when to review it. Every plan is kept as history. The plan with the latest start day that is not in the future becomes the app's current targets; a plan starting in the future is applied automatically when its day arrives. When loading old plans, go oldest first.",
      inputSchema: planInput,
    },
    async (input) => {
      const result = await savePlan(userId, today, input);
      refreshApp();
      return toolTextContent({
        saved: true,
        plan: result.plan,
        applied_to_current_targets: result.appliedToCurrentTargets,
        note: result.appliedToCurrentTargets
          ? undefined
          : "Saved as history. The current targets come from the plan with the latest start day up to today.",
      });
    },
  );

  server.registerTool(
    "get_plans",
    {
      description: "Read the history of nutrition phases and targets, oldest first, with each decision, its reason and review day.",
      inputSchema: z.object({}),
    },
    async () => toolTextContent({ plans: await listPlans(userId) }),
  );

  server.registerTool(
    "get_routine",
    {
      description:
        "Read the full current routine: weekly slots and every exercise of every session with its catalog id, sets, reps and current weight. Read it before set_routine.",
      inputSchema: z.object({}),
    },
    async () => toolTextContent(await getCurrentRoutine(userId)),
  );

  server.registerTool(
    "set_routine",
    {
      description:
        "Replace the training routine with a new version starting today: weekly slots and every exercise. Omit current_weight, reps_max, target_seconds, rest_seconds, target_rir or notes to keep what the current routine has for the same exercise; pass null to clear one. The routine being replaced is archived with its final state, never lost. Call it on the day the new routine starts; pass the reason and, for a time-boxed experiment, review_on.",
      inputSchema: routineInput,
    },
    async (input) => {
      const result = await replaceRoutine(userId, today, input);
      refreshApp();
      return toolTextContent({
        saved: true,
        version: result.version,
        previous_routine_archived: result.previousArchived,
      });
    },
  );

  server.registerTool(
    "get_routine_history",
    {
      description:
        "Read every routine version, oldest first: start and end day, reason, review day, the routine as planned and its final state when it was replaced.",
      inputSchema: z.object({}),
    },
    async () => toolTextContent({ versions: await listRoutineVersions(userId) }),
  );
}
