import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { deleteMeasurement, listMeasurements, saveMeasurement } from "@/lib/data/bodyMeasurements";
import { createScan, deleteScan, recentScans, scanDayTaken, updateScan } from "@/lib/data/bodyScans";
import {
  createCatalogItem,
  deleteCatalogItem,
  listCatalogItems,
  updateCatalogItem,
} from "@/lib/data/catalogItems";
import { normalizeSubject } from "@/lib/ai/facts";
import { deactivateRule, listActiveRules } from "@/lib/data/coachRules";
import { setDayFields } from "@/lib/data/dayFields";
import { deleteFatigueLog, listFatigueLogs, writeFatigueLog } from "@/lib/data/fatigueLogs";
import { deletePlan, updatePlan } from "@/lib/data/plans";
import { updateProfileFields } from "@/lib/data/profileFields";
import { deleteWorkoutForDay } from "@/lib/data/workouts";
import type { FatigueTimeOfDay } from "@/lib/constants";
import { dayConfig } from "@/lib/dates";
import type { Profile } from "@/lib/db/schema";
import {
  manageBodyScanInput,
  manageCatalogInput,
  manageDayInput,
  manageFatigueInput,
  manageMeasurementInput,
  managePlanInput,
  manageRuleInput,
  manageWorkoutInput,
  updateProfileInput,
} from "@/lib/history/manageSchemas";
import { futureDayError, toolError, toolTextContent } from "@/lib/mcp/toolResult";

const APP_PATHS = ["/", "/workout", "/routine", "/body", "/catalog", "/coach", "/settings", "/settings/targets", "/settings/profile"];

function refreshApp() {
  for (const path of APP_PATHS) revalidatePath(path);
}

function refreshCatalog() {
  revalidateTag("catalog", { expire: 0 });
  refreshApp();
}

export function registerManageTools(server: McpServer, userId: string, profile: Profile, today: string) {
  const cfg = dayConfig(profile);
  server.registerTool(
    "manage_day",
    {
      description:
        "Set fields of any past or present day: steps, notes, day type (gym or rest) and whether the day is closed. Only the fields you pass change.",
      inputSchema: manageDayInput,
    },
    async (input) => {
      const future = futureDayError(input.day, today);
      if (future) return future;
      const day = await setDayFields(userId, profile, today, input);
      refreshApp();
      return toolTextContent({ saved: true, day });
    },
  );

  server.registerTool(
    "manage_measurement",
    {
      description:
        "Body measurements (waist, weight, progress photo marker). action log: type, day and value (value required for waist and weight, omitted for photo). action delete: id. action list: newest first with ids, optional type filter.",
      inputSchema: manageMeasurementInput,
    },
    async (input) => {
      if (input.action === "list") {
        return toolTextContent({ measurements: await listMeasurements(userId, input.limit, input.type) });
      }
      if (input.action === "delete") {
        if (!input.id) return toolError("delete needs id.");
        const deleted = await deleteMeasurement(userId, input.id);
        refreshApp();
        return toolTextContent({ deleted, id: input.id });
      }
      if (!input.type || !input.day) return toolError("log needs type and day.");
      const isPhoto = input.type === "photo";
      if (!isPhoto && input.value == null) return toolError(`log ${input.type} needs a positive value.`);
      const future = futureDayError(input.day, today);
      if (future) return future;
      const value = isPhoto ? null : (input.value ?? null);
      await saveMeasurement(userId, { type: input.type, value, logical_day: input.day });
      refreshApp();
      return toolTextContent({ saved: true, type: input.type, value, day: input.day });
    },
  );

  server.registerTool(
    "manage_body_scan",
    {
      description:
        "Body composition scans (InBody). action list: newest first with ids and every field. action create: taken_on and fields, one scan per day. action update: id and the fields to correct (taken_on optional). action delete: id.",
      inputSchema: manageBodyScanInput,
    },
    async (input) => {
      if (input.action === "list") return toolTextContent({ scans: await recentScans(userId, input.limit) });
      if (input.action === "delete") {
        if (!input.id) return toolError("delete needs id.");
        const deleted = await deleteScan(userId, input.id);
        refreshApp();
        return toolTextContent({ deleted, id: input.id });
      }
      if (input.action === "create") {
        if (!input.taken_on || !input.fields) return toolError("create needs taken_on and fields.");
        const future = futureDayError(input.taken_on, today);
        if (future) return future;
        if (await scanDayTaken(userId, input.taken_on, cfg)) {
          return toolError(`A scan already exists on ${input.taken_on}; update it instead.`);
        }
        const scan = await createScan(userId, input.taken_on, input.fields);
        refreshApp();
        return toolTextContent({ saved: true, scan });
      }
      if (!input.id || !input.fields) return toolError("update needs id and fields.");
      if (!Object.keys(input.fields).length && !input.taken_on) return toolError("update needs at least one field.");
      if (input.taken_on) {
        const future = futureDayError(input.taken_on, today);
        if (future) return future;
        if (await scanDayTaken(userId, input.taken_on, cfg, input.id)) {
          return toolError(`Another scan already exists on ${input.taken_on}.`);
        }
      }
      const scan = await updateScan(userId, input.id, input.fields, input.taken_on);
      refreshApp();
      return scan ? toolTextContent({ saved: true, scan }) : toolError(`No scan with id ${input.id}.`);
    },
  );

  server.registerTool(
    "manage_workout",
    {
      description:
        "Delete the gym session logged on a day (with all its exercises and sets). To rewrite a session instead, use replace_day with a workout.",
      inputSchema: manageWorkoutInput,
    },
    async (input) => {
      const deleted = await deleteWorkoutForDay(userId, input.day);
      refreshApp();
      return toolTextContent({ deleted, day: input.day });
    },
  );

  server.registerTool(
    "manage_plan",
    {
      description:
        "Correct the nutrition plan history. action delete: id. action update: id and the fields to change (phase, kcal_delta, targets, decision, reason, effective_from, review_on). Ids come from get_plans. The app's current targets are recalculated afterwards from the plan with the latest start day up to today.",
      inputSchema: managePlanInput,
    },
    async (input) => {
      if (input.action === "delete") {
        const result = await deletePlan(userId, input.id, today);
        refreshApp();
        return toolTextContent({
          deleted: result.deleted,
          id: input.id,
          current_plan_id: result.currentPlanId,
          note: result.currentPlanId ? undefined : "No plan applies today; the app keeps its last targets until a plan applies.",
        });
      }
      if (!input.fields || !Object.keys(input.fields).length) return toolError("update needs at least one field.");
      const result = await updatePlan(userId, input.id, today, input.fields);
      refreshApp();
      if (!result.plan) return toolError(`No plan with id ${input.id}.`);
      return toolTextContent({
        saved: true,
        plan: result.plan,
        current_plan_id: result.currentPlanId,
        note: result.currentPlanId ? undefined : "No plan applies today; the app keeps its last targets until a plan applies.",
      });
    },
  );

  server.registerTool(
    "manage_catalog",
    {
      description:
        "The user's saved food catalog. action list: every item with ids (filter by place, paginate with offset). action create: fields with at least name. action update: id and the fields to change (archived: true takes it out of rotation). action delete: id.",
      inputSchema: manageCatalogInput,
    },
    async (input) => {
      if (input.action === "list") {
        const items = await listCatalogItems(userId, {
          place: input.place,
          includeArchived: input.include_archived,
          offset: input.offset,
          limit: input.limit,
        });
        return toolTextContent({ items, offset: input.offset, returned: items.length });
      }
      if (input.action === "delete") {
        if (!input.id) return toolError("delete needs id.");
        const deleted = await deleteCatalogItem(userId, input.id);
        refreshCatalog();
        return toolTextContent({ deleted, id: input.id });
      }
      if (input.action === "create") {
        if (!input.fields?.name) return toolError("create needs fields.name.");
        const item = await createCatalogItem(userId, { ...input.fields, name: input.fields.name });
        refreshCatalog();
        return toolTextContent({ saved: true, item });
      }
      if (!input.id || !input.fields || !Object.keys(input.fields).length) {
        return toolError("update needs id and at least one field.");
      }
      const item = await updateCatalogItem(userId, input.id, input.fields);
      refreshCatalog();
      return item ? toolTextContent({ saved: true, item }) : toolError(`No catalog item with id ${input.id}.`);
    },
  );

  server.registerTool(
    "manage_rule",
    {
      description:
        "The user's standing rules and preferences. action list: the active ones. action delete: key. To set or change a rule use update_rule.",
      inputSchema: manageRuleInput,
    },
    async (input) => {
      if (input.action === "list") return toolTextContent({ rules: await listActiveRules(userId) });
      if (!input.key) return toolError("delete needs key.");
      const exact = await deactivateRule(userId, input.key);
      if (exact) return toolTextContent({ deleted: true, key: input.key });
      const normalized = normalizeSubject(input.key);
      const deleted = normalized ? await deactivateRule(userId, normalized) : false;
      return toolTextContent({ deleted, key: normalized ?? input.key });
    },
  );

  server.registerTool(
    "manage_fatigue",
    {
      description:
        "Energy/fatigue check-ins. action log: day and time_of_day, writes exactly the score, sleep_hours and sleep_location given (null clears one). action delete: day and time_of_day. action list: recent ones.",
      inputSchema: manageFatigueInput,
    },
    async (input) => {
      if (input.action === "list") return toolTextContent({ logs: await listFatigueLogs(userId, input.limit) });
      if (!input.day || !input.time_of_day) return toolError(`${input.action} needs day and time_of_day.`);
      if (input.action === "delete") {
        const deleted = await deleteFatigueLog(userId, input.day, input.time_of_day);
        refreshApp();
        return toolTextContent({ deleted, day: input.day, time_of_day: input.time_of_day });
      }
      const future = futureDayError(input.day, today);
      if (future) return future;
      await writeFatigueLog(userId, {
        logical_day: input.day,
        time_of_day: input.time_of_day as FatigueTimeOfDay,
        score: input.score ?? null,
        sleep_hours: input.sleep_hours ?? null,
        sleep_location: input.sleep_location ?? null,
      });
      refreshApp();
      return toolTextContent({ saved: true, day: input.day, time_of_day: input.time_of_day });
    },
  );

  server.registerTool(
    "update_profile",
    {
      description:
        "Update the user's profile settings: sex, birth year, height, timezone, day cutoff hour, dining mode and chat language. Only the fields you pass change. Targets are set with set_plan.",
      inputSchema: updateProfileInput,
    },
    async (input) => {
      if (!Object.keys(input).length) return toolError("Pass at least one field.");
      const profile = await updateProfileFields(userId, input);
      refreshApp();
      return profile ? toolTextContent({ saved: true }) : toolError("Profile not found.");
    },
  );
}
