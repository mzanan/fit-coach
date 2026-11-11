import { MEMORY_FILE_MAX_CHARS } from "@/lib/constants";

export type TextEdit = { ok: true; content: string } | { ok: false; error: string };

interface ListedFile {
  path: string;
  content: string;
}

function splitLines(content: string): string[] {
  return content.split("\n");
}

function numbered(lines: string[], first: number): string {
  return lines.map((line, index) => `${String(first + index).padStart(6)}\t${line}`).join("\n");
}

export function viewFileText(path: string, content: string, range?: number[]): TextEdit {
  const lines = splitLines(content);
  if (!range) return { ok: true, content: `Here's the content of ${path} with line numbers:\n${numbered(lines, 1)}` };
  const [start, rawEnd] = range;
  const end = rawEnd === -1 ? lines.length : rawEnd;
  if (start < 1 || start > lines.length || end < start || end > lines.length) {
    return { ok: false, error: `Error: Invalid view_range [${range.join(", ")}]. Lines go from 1 to ${lines.length}.` };
  }
  return {
    ok: true,
    content: `Here's the content of ${path} with line numbers:\n${numbered(lines.slice(start - 1, end), start)}`,
  };
}

function occurrenceLines(content: string, needle: string): number[] {
  const found: number[] = [];
  let at = content.indexOf(needle);
  while (at !== -1) {
    found.push(content.slice(0, at).split("\n").length);
    at = content.indexOf(needle, at + 1);
  }
  return found;
}

export function replaceOnce(path: string, content: string, oldStr: string, newStr: string): TextEdit {
  if (!oldStr) return { ok: false, error: "Error: old_str must not be empty." };
  const lines = occurrenceLines(content, oldStr);
  if (lines.length === 0) {
    return { ok: false, error: `No replacement was performed, old_str \`${oldStr}\` did not appear verbatim in ${path}.` };
  }
  if (lines.length > 1) {
    return {
      ok: false,
      error: `No replacement was performed. Multiple occurrences of old_str \`${oldStr}\` in lines: ${lines.join(", ")}. Please ensure it is unique`,
    };
  }
  return { ok: true, content: content.replace(oldStr, () => newStr) };
}

export function insertAtLine(content: string, line: number, text: string): TextEdit {
  const lines = splitLines(content);
  if (line < 0 || line > lines.length) {
    return {
      ok: false,
      error: `Error: Invalid \`insert_line\` parameter: ${line}. It should be within the range of lines of the file: [0, ${lines.length}]`,
    };
  }
  return { ok: true, content: [...lines.slice(0, line), ...splitLines(text), ...lines.slice(line)].join("\n") };
}

export function sizeError(path: string, content: string): string | null {
  if (content.length <= MEMORY_FILE_MAX_CHARS) return null;
  return `Error: ${path} would have ${content.length} characters; the limit is ${MEMORY_FILE_MAX_CHARS}. Split this topic into smaller files.`;
}

function depth(path: string): number {
  return path.split("/").filter(Boolean).length;
}

export function folderListing(folder: string, files: ListedFile[]): string {
  const base = depth(folder);
  const lines = files
    .filter((file) => file.path.startsWith(`${folder}/`) && depth(file.path) - base <= 2)
    .map((file) => `${file.content.length}\t${file.path}`)
    .sort((a, b) => a.split("\t")[1].localeCompare(b.split("\t")[1]));
  return [`Here're the files and directories up to 2 levels deep in ${folder}, excluding hidden items:`, ...lines].join("\n");
}

export function entryText(text: string): string | undefined {
  const entries = text
    .split("\n")
    .map((line) => line.replace(/^\s*-\s*(\d{4}-\d{2}-\d{2}\s*)?!?\s*:?\s*/, "").trim())
    .filter((line) => line && !line.startsWith("#"));
  return entries.length ? entries.join(" · ") : undefined;
}

export function addedLines(before: string, after: string): string {
  const previous = new Set(before.split("\n"));
  return after
    .split("\n")
    .filter((line) => !previous.has(line))
    .join("\n");
}
