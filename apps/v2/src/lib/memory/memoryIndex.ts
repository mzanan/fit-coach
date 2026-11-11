import { MEMORY_INDEX_PATH, MEMORY_SUMMARY_MAX } from "@/lib/constants";
import { cityFolder } from "@/lib/memory/memoryPath";
import { cityKey } from "@/lib/userMemory";

interface IndexedFile {
  path: string;
  content: string;
}

const KEY_ENTRY = /^\s*-\s*(?:\d{4}-\d{2}-\d{2}\s*)?!\s*:?\s*(.+)$/;

function fileTitle(lines: string[]): string {
  const first = lines.find((line) => line.startsWith("#")) ?? lines.find((line) => line.trim()) ?? "";
  return first.replace(/^#+\s*/, "").trim();
}

export function keyEntries(content: string): string[] {
  return content.split("\n").flatMap((line) => {
    const match = KEY_ENTRY.exec(line);
    return match ? [match[1].trim()] : [];
  });
}

function fileSummary(content: string): string {
  const lines = content.split("\n");
  const summary = [fileTitle(lines), ...keyEntries(content)].filter(Boolean).join(" · ");
  return summary.length > MEMORY_SUMMARY_MAX ? `${summary.slice(0, MEMORY_SUMMARY_MAX)}...` : summary;
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
