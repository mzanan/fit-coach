import { MEMORY_INDEX_PATH, MEMORY_SUMMARY_MAX, MEMORY_TITLE_MAX } from "@/lib/constants";
import { cityFolder } from "@/lib/memory/memoryPath";
import { cityKey } from "@/lib/userMemory";

interface IndexedFile {
  path: string;
  content: string;
}

const KEY_ENTRY = /^- \d{4}-\d{2}-\d{2} !: (\S.*)$/;

function contentLines(content: string): string[] {
  return content.split(/\r?\n/).map((line) => line.trimEnd());
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function fileTitle(lines: string[]): string {
  const heading = lines.find((line) => line.startsWith("#")) ?? "";
  return clip(heading.replace(/^#+\s*/, "").trim(), MEMORY_TITLE_MAX);
}

export function keyEntries(content: string): string[] {
  return contentLines(content).flatMap((line) => {
    const match = KEY_ENTRY.exec(line);
    return match ? [match[1].trim()] : [];
  });
}

function fileSummary(content: string): string {
  const keys = keyEntries(content);
  let summary = fileTitle(contentLines(content));
  for (const [index, key] of keys.entries()) {
    const next = summary ? `${summary} · ${key}` : key;
    if (next.length > MEMORY_SUMMARY_MAX) {
      return `${summary} · +${keys.length - index} more key entries: view the file`;
    }
    summary = next;
  }
  return summary;
}

export function memoryCities(files: { path: string }[]): string[] {
  const cities = files.map((file) => cityFolder(file.path)).filter((city): city is string => Boolean(city));
  return [...new Set(cities)].sort();
}

export function filesForLocation<T extends IndexedFile>(files: T[], currentLocation: string | null): T[] {
  if (!currentLocation) return files;
  return files.filter((file) => {
    const city = cityFolder(file.path);
    return city === null || cityKey(city) === cityKey(currentLocation);
  });
}

export function memoryIndexLines(files: IndexedFile[]): string[] {
  return [...files]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => `- ${file.path}: ${fileSummary(file.content)}`);
}

export function memoryIndexText(files: IndexedFile[]): string {
  const lines = memoryIndexLines(files);
  return [`# ${MEMORY_INDEX_PATH}`, ...(lines.length ? lines : ["(no memory files yet)"])].join("\n");
}
