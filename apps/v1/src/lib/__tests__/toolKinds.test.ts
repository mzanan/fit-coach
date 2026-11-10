import { describe, expect, it } from "vitest";

import { WRITE_TOOLS } from "@/lib/constants";
import { isWriteTool } from "@/lib/toolKinds";

const READ_TOOLS = [
  "get_current_time",
  "get_today",
  "get_day_status",
  "suggest_meals",
  "search_catalog",
  "get_workouts",
  "get_body_scans",
  "check_progression_eligible",
  "get_todays_routine",
  "get_progress_overview",
  "get_upcoming_reminders",
  "get_day",
  "get_plans",
  "get_routine",
  "get_routine_history",
  "get_coach_memory",
];

const MCP_WRITE_TOOLS = [
  "replace_day",
  "delete_meal",
  "set_plan",
  "set_routine",
  "manage_day",
  "manage_measurement",
  "manage_body_scan",
  "manage_workout",
  "manage_plan",
  "manage_catalog",
  "manage_rule",
  "manage_fatigue",
  "update_profile",
  "remember_fact",
  "manage_health_event",
  "manage_pending_item",
];

describe("isWriteTool", () => {
  it("treats every coach write tool as a write", () => {
    expect(WRITE_TOOLS.filter((name) => !isWriteTool(name))).toEqual([]);
  });

  it("treats every MCP write tool as a write", () => {
    expect(MCP_WRITE_TOOLS.filter((name) => !isWriteTool(name))).toEqual([]);
  });

  it("never ledgers a read tool", () => {
    expect(READ_TOOLS.filter(isWriteTool)).toEqual([]);
  });
});
