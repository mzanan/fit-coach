import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { listActiveRules } from "@/lib/data/coachRules";
import { deleteHealthEvent, getHealthEvent, listHealthEvents, logHealthEvent, updateHealthEvent } from "@/lib/data/healthEvents";
import { addPendingItem, deletePendingItem, listPendingItems, markPendingItemDone, updatePendingItem } from "@/lib/data/pendingItems";
import { listFacts } from "@/lib/data/userFacts";
import type { Profile } from "@/lib/db/schema";
import { MEMORY_DETAILS_MAX, MEMORY_HEALTH_EVENTS_MAX, MEMORY_PENDING_ITEMS_MAX } from "@/lib/constants";
import { manageHealthEventInput, managePendingItemInput } from "@/lib/history/memorySchemas";
import { futureDayError, toolError, toolTextContent } from "@/lib/mcp/toolResult";
import { clipText, endsBeforeStart, factsForLocation, groupFactsByDomain, hasAnyField, knownCities } from "@/lib/userMemory";

const RANGE_ERROR = "resolved_on cannot be before started_on.";

export function registerMemoryTools(server: McpServer, userId: string, profile: Profile, today: string) {
  server.registerTool(
    "get_coach_memory",
    {
      description:
        "Read everything the coach must know before answering: the coaching method the user wrote, the city the user lives in now, every current fact about the user grouped by domain (facts scoped to another city are left out), standing rules, open pending items (shopping, to-dos, appointments) and open health events. Call it at the start of every conversation.",
      inputSchema: z.object({}),
    },
    async () => {
      const [facts, rules, pendingItems, openHealth] = await Promise.all([
        listFacts(userId),
        listActiveRules(userId),
        listPendingItems(userId, false, MEMORY_PENDING_ITEMS_MAX),
        listHealthEvents(userId, false, MEMORY_HEALTH_EVENTS_MAX),
      ]);
      return toolTextContent({
        today,
        method: profile.coach_rules ?? null,
        current_location: profile.current_location,
        known_cities: knownCities(facts),
        facts: groupFactsByDomain(factsForLocation(facts, profile.current_location)),
        standing_rules: rules,
        pending_items: pendingItems,
        open_health_events: openHealth.map((event) => ({ ...event, details: clipText(event.details, MEMORY_DETAILS_MAX) })),
      });
    },
  );

  server.registerTool(
    "manage_health_event",
    {
      description:
        "Health history: problems, digestion, illness, injuries and checkups. action log: kind, title, started_on, optional details and resolved_on. action update: id and the fields to change; set resolved_on when it is over, null reopens it. action delete: id, only for a wrong entry. action list: open ones, include_resolved for history.",
      inputSchema: manageHealthEventInput,
    },
    async (input) => {
      if (input.action === "list") {
        return toolTextContent({ events: await listHealthEvents(userId, input.include_resolved, input.limit) });
      }
      if (input.action === "delete") {
        if (!input.id) return toolError("delete needs id.");
        return toolTextContent({ deleted: await deleteHealthEvent(userId, input.id), id: input.id });
      }
      const future = futureDayError(input.started_on, today) ?? futureDayError(input.resolved_on, today);
      if (future) return future;
      if (input.action === "update") {
        if (!input.id) return toolError("update needs id.");
        const { kind, title, details, started_on, resolved_on } = input;
        const patch = { kind, title, details, started_on, resolved_on };
        if (!hasAnyField(patch)) return toolError("update needs at least one field to change.");
        const current = await getHealthEvent(userId, input.id);
        if (!current) return toolError(`No health event ${input.id}.`);
        const start = started_on ?? current.started_on;
        const end = resolved_on === undefined ? current.resolved_on : resolved_on;
        if (endsBeforeStart(start, end)) return toolError(RANGE_ERROR);
        const event = await updateHealthEvent(userId, input.id, patch);
        return event ? toolTextContent({ saved: true, event }) : toolError(`No health event ${input.id}.`);
      }
      if (input.started_on && endsBeforeStart(input.started_on, input.resolved_on)) return toolError(RANGE_ERROR);
      if (!input.kind || !input.title || !input.started_on) return toolError("log needs kind, title and started_on.");
      const event = await logHealthEvent(userId, {
        kind: input.kind,
        title: input.title,
        details: input.details ?? null,
        started_on: input.started_on,
        resolved_on: input.resolved_on ?? null,
      });
      return toolTextContent({ saved: true, event });
    },
  );

  server.registerTool(
    "manage_pending_item",
    {
      description:
        "Open items the user wants kept: shopping list, to-dos and appointments. They are not notifications: get_coach_memory returns the open ones, and you raise the relevant ones yourself. action add: kind, text, optional due_on. action update: id and the fields to change. action done: id (keeps the first done day). action reopen: id. action delete: id, only for a wrong entry. action list: open ones, include_done for history.",
      inputSchema: managePendingItemInput,
    },
    async (input) => {
      if (input.action === "list") {
        return toolTextContent({ pending_items: await listPendingItems(userId, input.include_done, input.limit) });
      }
      if (input.action === "add") {
        if (!input.kind || !input.text) return toolError("add needs kind and text.");
        const item = await addPendingItem(userId, { kind: input.kind, text: input.text, due_on: input.due_on ?? null });
        return toolTextContent({ saved: true, item });
      }
      if (!input.id) return toolError(`${input.action} needs id.`);
      if (input.action === "delete") {
        return toolTextContent({ deleted: await deletePendingItem(userId, input.id), id: input.id });
      }
      if (input.action === "done") {
        const item = await markPendingItemDone(userId, input.id, today);
        return item ? toolTextContent({ saved: true, item }) : toolError(`No pending item ${input.id}.`);
      }
      const patch =
        input.action === "reopen" ? { done_on: null } : { kind: input.kind, text: input.text, due_on: input.due_on };
      if (!hasAnyField(patch)) return toolError("update needs at least one field to change.");
      const item = await updatePendingItem(userId, input.id, patch);
      return item ? toolTextContent({ saved: true, item }) : toolError(`No pending item ${input.id}.`);
    },
  );
}
