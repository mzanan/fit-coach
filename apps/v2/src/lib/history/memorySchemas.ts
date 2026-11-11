import { z } from "zod";

import {
  HEALTH_DETAILS_MAX,
  HEALTH_EVENT_KINDS,
  HEALTH_TITLE_MAX,
  PENDING_ITEM_KINDS,
  MEMORY_COMMANDS,
  MEMORY_PATH_MAX,
  PENDING_ITEM_TEXT_MAX,
} from "@/lib/constants";
import { calendarDay } from "@/lib/validation";

const id = z.string().min(1);

const memoryPath = z.string().min(1).max(MEMORY_PATH_MAX);

export const memoryCommandInput = z.object({
  command: z.enum(MEMORY_COMMANDS),
  path: memoryPath.optional().describe("every command except rename: a path under /memories, e.g. /memories/diet.md"),
  view_range: z
    .array(z.number().int())
    .length(2)
    .optional()
    .describe("view of a file only: [first_line, last_line], 1-based; -1 as last_line means the end"),
  file_text: z.string().optional().describe("create: the whole content of the new file"),
  old_str: z.string().optional().describe("str_replace: text that appears exactly once in the file"),
  new_str: z.string().optional().describe("str_replace: replacement text; empty removes old_str"),
  insert_line: z.number().int().min(0).optional().describe("insert: line number to insert after; 0 is the top"),
  insert_text: z.string().optional().describe("insert: text to insert"),
  old_path: memoryPath.optional().describe("rename: current path"),
  new_path: memoryPath.optional().describe("rename: new path; it must not exist"),
});

export type MemoryCommandInput = z.infer<typeof memoryCommandInput>;

export const manageHealthEventInput = z.object({
  action: z.enum(["list", "log", "update", "delete"]),
  id: id.optional().describe("update and delete: id from list"),
  kind: z.enum(HEALTH_EVENT_KINDS).optional().describe("log: required"),
  title: z.string().trim().min(1).max(HEALTH_TITLE_MAX).optional().describe("log: required"),
  details: z.string().trim().max(HEALTH_DETAILS_MAX).nullable().optional(),
  started_on: calendarDay.optional().describe("log: required, the day it started or happened"),
  resolved_on: calendarDay.nullable().optional().describe("the day it was resolved; null reopens it"),
  include_resolved: z.boolean().default(false).describe("list: also return resolved events"),
  limit: z.number().int().min(1).max(200).default(50),
});

export const managePendingItemInput = z.object({
  action: z.enum(["list", "add", "update", "done", "reopen", "delete"]),
  id: id.optional().describe("update, done, reopen and delete: id from list"),
  kind: z.enum(PENDING_ITEM_KINDS).optional().describe("add: required"),
  text: z.string().trim().min(1).max(PENDING_ITEM_TEXT_MAX).optional().describe("add: required"),
  due_on: calendarDay.nullable().optional(),
  include_done: z.boolean().default(false).describe("list: also return done items"),
  limit: z.number().int().min(1).max(200).default(100),
});
