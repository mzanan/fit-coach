import { MEMORY_INDEX_PATH } from "@/lib/constants";
import { cityFolder } from "@/lib/memory/memoryPath";
import { cityKey } from "@/lib/userMemory";

interface IndexedFile {
  path: string;
  content: string;
}

const TITLE_MAX = 120;

function fileTitle(content: string): string {
  const first = content.split("\n").find((line) => line.trim()) ?? "";
  const title = first.replace(/^#+\s*/, "").trim();
  return title.length > TITLE_MAX ? `${title.slice(0, TITLE_MAX)}...` : title;
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
    .map((file) => `- ${file.path}: ${fileTitle(file.content)}`);
}

export function memoryIndexText(files: IndexedFile[]): string {
  const lines = memoryIndexLines(files);
  return [`# ${MEMORY_INDEX_PATH}`, ...(lines.length ? lines : ["(no memory files yet)"])].join("\n");
}
