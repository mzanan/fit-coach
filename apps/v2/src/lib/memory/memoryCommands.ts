import "server-only";

import type { MemoryWrite } from "@/lib/ai/coachReceipts";
import { MEMORY_WRITE_RETRIES } from "@/lib/constants";
import {
  deleteMemoryPath,
  getMemoryFile,
  insertMemoryFile,
  listMemoryFiles,
  renameMemoryPath,
  updateMemoryFile,
  type StoredMemoryFile,
} from "@/lib/data/memoryFiles";
import { memoryIndexText } from "@/lib/memory/memoryIndex";
import { isInsideFolder, isMemoryIndex, isMemoryRoot, normalizeMemoryPath } from "@/lib/memory/memoryPath";
import { addedLines, entryText, folderListing, insertAtLine, replaceOnce, sizeError, viewFileText, type TextEdit } from "@/lib/memory/memoryText";
import type { MemoryCommandInput } from "@/lib/history/memorySchemas";

export type MemoryResult = { result: string } | { error: string };

type OnWrite = (write: MemoryWrite) => void;

const INDEX_READ_ONLY = "Error: /memories/MEMORY.md is the index the app builds; it is read-only.";

function fail(error: string): MemoryResult {
  return { error };
}

function missing(name: string): MemoryResult {
  return fail(`Error: ${name} is required for this command.`);
}

function pathOf(raw: string | undefined, name = "path"): { path: string } | MemoryResult {
  if (raw === undefined) return missing(name);
  const normalized = normalizeMemoryPath(raw);
  return normalized.ok ? { path: normalized.path } : fail(normalized.error);
}

async function folderHasFiles(userId: string, folder: string): Promise<boolean> {
  return (await listMemoryFiles(userId)).some((file) => isInsideFolder(file.path, folder));
}

async function view(userId: string, path: string, range?: number[]): Promise<MemoryResult> {
  const files = await listMemoryFiles(userId);
  if (isMemoryIndex(path)) return { result: memoryIndexText(files) };
  const file = files.find((candidate) => candidate.path === path);
  if (file) {
    const shown = viewFileText(path, file.content, range);
    return shown.ok ? { result: shown.content } : fail(shown.error);
  }
  if (isMemoryRoot(path) || files.some((candidate) => isInsideFolder(candidate.path, path))) {
    return { result: folderListing(path, files) };
  }
  return fail(`Error: The path ${path} does not exist`);
}

async function create(userId: string, path: string, text: string, onWrite?: OnWrite): Promise<MemoryResult> {
  if (isMemoryIndex(path)) return fail(INDEX_READ_ONLY);
  if (isMemoryRoot(path) || (await folderHasFiles(userId, path))) return fail(`Error: ${path} is a directory`);
  const tooLarge = sizeError(path, text);
  if (tooLarge) return fail(tooLarge);
  if (!(await insertMemoryFile(userId, path, text))) {
    return fail(`Error: File ${path} already exists. View it and edit it with str_replace or insert.`);
  }
  onWrite?.({ kind: "memory", receipt: `Memory file created: ${path}.`, learned: entryText(text) });
  return { result: `File created successfully at: ${path}` };
}

async function editFile(
  userId: string,
  path: string,
  edit: (file: StoredMemoryFile) => TextEdit,
  onWrite?: OnWrite,
): Promise<MemoryResult> {
  if (isMemoryIndex(path)) return fail(INDEX_READ_ONLY);
  for (let attempt = 0; attempt < MEMORY_WRITE_RETRIES; attempt += 1) {
    const file = await getMemoryFile(userId, path);
    if (!file) return fail(`Error: The path ${path} does not exist`);
    const edited = edit(file);
    if (!edited.ok) return fail(edited.error);
    const tooLarge = sizeError(path, edited.content);
    if (tooLarge) return fail(tooLarge);
    if (await updateMemoryFile(userId, file, edited.content)) {
      onWrite?.({ kind: "memory", receipt: `Memory updated: ${path}.`, learned: entryText(addedLines(file.content, edited.content)) });
      return { result: `The file ${path} has been edited.` };
    }
  }
  return fail(`Error: ${path} kept changing while it was being edited. View it again and retry.`);
}

async function remove(userId: string, path: string, onWrite?: OnWrite): Promise<MemoryResult> {
  if (isMemoryRoot(path)) return fail("Error: The memory root cannot be deleted.");
  if (isMemoryIndex(path)) return fail(INDEX_READ_ONLY);
  const deleted = await deleteMemoryPath(userId, path);
  if (!deleted) return fail(`Error: The path ${path} does not exist`);
  onWrite?.({ kind: "memory", receipt: `Memory deleted: ${path}.` });
  return { result: `Successfully deleted ${path}` };
}

async function rename(userId: string, from: string, to: string, onWrite?: OnWrite): Promise<MemoryResult> {
  if (isMemoryRoot(from) || isMemoryRoot(to)) return fail("Error: The memory root cannot be renamed.");
  if (isMemoryIndex(from) || isMemoryIndex(to)) return fail(INDEX_READ_ONLY);
  if (from === to || isInsideFolder(to, from)) return fail(`Error: Cannot move ${from} into ${to}`);
  const files = await listMemoryFiles(userId);
  if (files.some((file) => file.path === to || isInsideFolder(file.path, to))) {
    return fail(`Error: The destination ${to} already exists`);
  }
  if (!files.some((file) => file.path === from || isInsideFolder(file.path, from))) {
    return fail(`Error: The path ${from} does not exist`);
  }
  await renameMemoryPath(userId, from, to);
  onWrite?.({ kind: "memory", receipt: `Memory moved: ${from} to ${to}.` });
  return { result: `Successfully renamed ${from} to ${to}` };
}

export async function runMemoryCommand(
  userId: string,
  input: MemoryCommandInput,
  onWrite?: OnWrite,
): Promise<MemoryResult> {
  if (input.command === "rename") {
    const from = pathOf(input.old_path, "old_path");
    if (!("path" in from)) return from;
    const to = pathOf(input.new_path, "new_path");
    if (!("path" in to)) return to;
    return rename(userId, from.path, to.path, onWrite);
  }
  const target = pathOf(input.path);
  if (!("path" in target)) return target;
  const { path } = target;
  switch (input.command) {
    case "view":
      return view(userId, path, input.view_range);
    case "create":
      if (input.file_text === undefined) return missing("file_text");
      return create(userId, path, input.file_text, onWrite);
    case "str_replace": {
      if (input.old_str === undefined) return missing("old_str");
      const oldStr = input.old_str;
      const newStr = input.new_str ?? "";
      return editFile(userId, path, (file) => replaceOnce(path, file.content, oldStr, newStr), onWrite);
    }
    case "insert": {
      if (input.insert_line === undefined) return missing("insert_line");
      if (input.insert_text === undefined) return missing("insert_text");
      const line = input.insert_line;
      const text = input.insert_text;
      return editFile(userId, path, (file) => insertAtLine(file.content, line, text), onWrite);
    }
    case "delete":
      return remove(userId, path, onWrite);
  }
}
