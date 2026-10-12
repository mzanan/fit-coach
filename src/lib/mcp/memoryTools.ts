import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { listActiveRules } from "@/lib/data/coachRules";
import { deleteHealthEvent, getHealthEvent, listHealthEvents, logHealthEvent, updateHealthEvent } from "@/lib/data/healthEvents";
import { addReminder, deleteReminder, listReminders, markReminderDone, updateReminder } from "@/lib/data/reminderList";
import { deleteFact, listFacts, retireScope, saveFact } from "@/lib/data/userFacts";
import type { Profile } from "@/lib/db/schema";
import { groupFactsByDomain } from "@/lib/factGroups";
import { factScope, factSubject } from "@/lib/factKeys";
import { manageHealthEventInput, manageReminderInput, rememberFactInput } from "@/lib/history/memorySchemas";
import { toolError, toolTextContent } from "@/lib/mcp/toolResult";

const MEMORY_DETAILS_MAX = 300;

function clip(text: string | null): string | null {
  return text && text.length > MEMORY_DETAILS_MAX ? `${text.slice(0, MEMORY_DETAILS_MAX)}...` : text;
}

function hasAny(fields: Record<string, unknown>): boolean {
  return Object.values(fields).some((value) => value !== undefined);
}

function futureDay(day: string | null | undefined, today: string) {
  return day && day > today ? toolError(`${day} is in the future; today is ${today}.`) : null;
}

export function registerMemoryTools(server: McpServer, userId: string, profile: Profile, today: string) {
  server.registerTool(
    "get_coach_memory",
    {
      description:
        "Read everything the coach must know before answering: the coaching method the user wrote, every current fact about the user grouped by domain, standing rules, open reminders (shopping, to-dos, appointments) and open health events. Call it at the start of every conversation.",
      inputSchema: z.object({}),
    },
    async () => {
      const [facts, rules, openReminders, openHealth] = await Promise.all([
        listFacts(userId),
        listActiveRules(userId),
        listReminders(userId, false, 50),
        listHealthEvents(userId, false, 20),
      ]);
      return toolTextContent({
        today,
        method: profile.coach_rules ?? null,
        facts: groupFactsByDomain(facts),
        standing_rules: rules,
        open_reminders: openReminders,
        open_health_events: openHealth.map((event) => ({ ...event, details: clip(event.details) })),
      });
    },
  );

  server.registerTool(
    "remember_fact",
    {
      description:
        "Facts about the user that are true now: preferences, constraints and context (diet, restaurants, training, measurements, health, lifestyle, context). action save: domain, subject, content; saving the same domain and subject replaces the old fact, pass replaces_id when a fact with another subject is now wrong; the result lists the other facts of that domain so you can spot duplicates. action delete: id, when a fact stops being true (history lives in meals, measurements and health events, not here). action retire_scope: scope, deletes every fact tied to it, e.g. location:da_nang after a move. action list: optional domain.",
      inputSchema: rememberFactInput,
    },
    async (input) => {
      if (input.action === "list") return toolTextContent({ facts: groupFactsByDomain(await listFacts(userId, input.domain)) });
      if (input.action === "delete") {
        if (!input.id) return toolError("delete needs id.");
        return toolTextContent({ deleted: await deleteFact(userId, input.id), id: input.id });
      }
      if (input.action === "retire_scope") {
        const scope = factScope(input.scope);
        if (!scope) return toolError("retire_scope needs scope.");
        return toolTextContent({ deleted: await retireScope(userId, scope), scope });
      }
      const subject = factSubject(input.subject);
      if (!input.domain || !input.content) return toolError("save needs domain, subject and content.");
      if (!subject) return toolError("subject needs letters or digits.");
      const { fact, replaced } = await saveFact(
        userId,
        {
          domain: input.domain,
          subject,
          content: input.content,
          scope: input.scope === undefined ? undefined : factScope(input.scope),
          review_on: input.review_on,
          source: "mcp",
        },
        input.replaces_id,
      );
      const sameDomain = (await listFacts(userId, input.domain)).filter((other) => other.id !== fact.id);
      return toolTextContent({
        saved: true,
        fact,
        ...(input.replaces_id ? { replaced_id: input.replaces_id, replaced } : {}),
        other_facts_in_domain: sameDomain.map(({ id, subject: otherSubject, content }) => ({ id, subject: otherSubject, content })),
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
      const future = futureDay(input.started_on, today) ?? futureDay(input.resolved_on, today);
      if (future) return future;
      if (input.action === "update") {
        if (!input.id) return toolError("update needs id.");
        const { kind, title, details, started_on, resolved_on } = input;
        const patch = { kind, title, details, started_on, resolved_on };
        if (!hasAny(patch)) return toolError("update needs at least one field to change.");
        const current = await getHealthEvent(userId, input.id);
        if (!current) return toolError(`No health event ${input.id}.`);
        const start = started_on ?? current.started_on;
        const end = resolved_on === undefined ? current.resolved_on : resolved_on;
        if (end && end < start) return toolError("resolved_on cannot be before started_on.");
        const event = await updateHealthEvent(userId, input.id, patch);
        return event ? toolTextContent({ saved: true, event }) : toolError(`No health event ${input.id}.`);
      }
      if (input.resolved_on && input.started_on && input.resolved_on < input.started_on) {
        return toolError("resolved_on cannot be before started_on.");
      }
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
    "manage_reminder",
    {
      description:
        "Open items the user wants kept: shopping list, to-dos and appointments. They are not notifications: read them with get_coach_memory and raise the relevant ones yourself. action add: kind, text, optional due_on. action update: id and the fields to change. action done: id (keeps the first done day). action reopen: id. action delete: id, only for a wrong entry. action list: open ones, include_done for history.",
      inputSchema: manageReminderInput,
    },
    async (input) => {
      if (input.action === "list") {
        return toolTextContent({ reminders: await listReminders(userId, input.include_done, input.limit) });
      }
      if (input.action === "add") {
        if (!input.kind || !input.text) return toolError("add needs kind and text.");
        const reminder = await addReminder(userId, { kind: input.kind, text: input.text, due_on: input.due_on ?? null });
        return toolTextContent({ saved: true, reminder });
      }
      if (!input.id) return toolError(`${input.action} needs id.`);
      if (input.action === "delete") {
        return toolTextContent({ deleted: await deleteReminder(userId, input.id), id: input.id });
      }
      if (input.action === "done") {
        const reminder = await markReminderDone(userId, input.id, today);
        return reminder ? toolTextContent({ saved: true, reminder }) : toolError(`No reminder ${input.id}.`);
      }
      const patch =
        input.action === "reopen" ? { done_on: null } : { kind: input.kind, text: input.text, due_on: input.due_on };
      if (!hasAny(patch)) return toolError("update needs at least one field to change.");
      const reminder = await updateReminder(userId, input.id, patch);
      return reminder ? toolTextContent({ saved: true, reminder }) : toolError(`No reminder ${input.id}.`);
    },
  );
}
