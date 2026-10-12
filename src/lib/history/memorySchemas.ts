import { z } from "zod";

import { FACT_CONTENT_MAX, FACT_DOMAINS, HEALTH_EVENT_KINDS, REMINDER_KINDS } from "@/lib/constants";
import { FACT_SUBJECT_MAX } from "@/lib/factKeys";
import { calendarDay } from "@/lib/validation";

const id = z.string().min(1);

export const rememberFactInput = z.object({
  action: z.enum(["list", "save", "delete", "retire_scope"]),
  domain: z.enum(FACT_DOMAINS).optional().describe("save: required; list: optional filter"),
  subject: z
    .string()
    .trim()
    .min(1)
    .max(FACT_SUBJECT_MAX)
    .optional()
    .describe("save: short stable key of what the fact is about, e.g. lunch_protein_floor; saving the same domain and subject replaces it"),
  content: z.string().trim().min(1).max(FACT_CONTENT_MAX).optional().describe("save: the fact, one or two sentences, true now"),
  scope: z
    .string()
    .trim()
    .max(80)
    .nullable()
    .optional()
    .describe("save: set when the fact only holds in a context, e.g. location:da_nang; omit to keep the current one, null clears it; retire_scope deletes every fact with that scope"),
  review_on: calendarDay.nullable().optional().describe("save: day to re-check the fact; omit to keep, null clears"),
  replaces_id: id.optional().describe("save: id of an older fact this one supersedes; it is deleted"),
  id: id.optional().describe("delete: id from list"),
});

export const manageHealthEventInput = z.object({
  action: z.enum(["list", "log", "update", "delete"]),
  id: id.optional().describe("update and delete: id from list"),
  kind: z.enum(HEALTH_EVENT_KINDS).optional().describe("log: required"),
  title: z.string().trim().min(1).max(200).optional().describe("log: required"),
  details: z.string().trim().max(2000).nullable().optional(),
  started_on: calendarDay.optional().describe("log: required, the day it started or happened"),
  resolved_on: calendarDay.nullable().optional().describe("the day it was resolved; null reopens it"),
  include_resolved: z.boolean().default(false).describe("list: also return resolved events"),
  limit: z.number().int().min(1).max(200).default(50),
});

export const manageReminderInput = z.object({
  action: z.enum(["list", "add", "update", "done", "reopen", "delete"]),
  id: id.optional().describe("update, done, reopen and delete: id from list"),
  kind: z.enum(REMINDER_KINDS).optional().describe("add: required"),
  text: z.string().trim().min(1).max(500).optional().describe("add: required"),
  due_on: calendarDay.nullable().optional(),
  include_done: z.boolean().default(false).describe("list: also return done reminders"),
  limit: z.number().int().min(1).max(200).default(100),
});
