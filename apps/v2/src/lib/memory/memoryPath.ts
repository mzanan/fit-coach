import { MEMORY_INDEX_PATH, MEMORY_PATH_MAX, MEMORY_ROOT } from "@/lib/constants";
import { locationSlug } from "@/lib/userMemory";

export type MemoryPathResult = { ok: true; path: string } | { ok: false; error: string };

const ROOT_SEGMENT = MEMORY_ROOT.slice(1);
const MAX_DEPTH = 3;
const FORBIDDEN = /[%\\\u0000-\u001f\u007f]/;

function invalid(error: string): MemoryPathResult {
  return { ok: false, error };
}

function isFolderSegment(segments: string[], index: number): boolean {
  return index === 1 && (segments.length === MAX_DEPTH || !segments[index].includes("."));
}

export function normalizeMemoryPath(raw: string): MemoryPathResult {
  const value = raw.trim();
  if (FORBIDDEN.test(value)) return invalid(`Error: Path ${JSON.stringify(raw)} has a forbidden character (%, \\ or a control character)`);
  const segments = value.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return invalid(`Error: Path ${raw} must not contain . or .. segments`);
  }
  if (segments.some((segment) => segment !== segment.trim())) {
    return invalid(`Error: Path ${raw} has a name that starts or ends with a space`);
  }
  if (!value.startsWith("/") || segments[0] !== ROOT_SEGMENT) {
    return invalid(`Error: Path ${raw} must start with ${MEMORY_ROOT}`);
  }
  if (segments.length > MAX_DEPTH) {
    return invalid(`Error: Path ${raw} is too deep. Folders under ${MEMORY_ROOT} are cities only: use ${MEMORY_ROOT}/<topic>.md or ${MEMORY_ROOT}/<city>/<topic>.md`);
  }
  const named: string[] = [];
  for (const [index, segment] of segments.entries()) {
    const name = isFolderSegment(segments, index) ? locationSlug(segment) : segment;
    if (!name) return invalid(`Error: Path ${raw} has a city folder without letters or digits`);
    named.push(name);
  }
  const path = `/${named.join("/")}`;
  if (path.length > MEMORY_PATH_MAX) {
    return invalid(`Error: Path ${raw} is longer than ${MEMORY_PATH_MAX} characters`);
  }
  return { ok: true, path };
}

export function isMemoryRoot(path: string): boolean {
  return path === MEMORY_ROOT;
}

export function isMemoryIndex(path: string): boolean {
  return path === MEMORY_INDEX_PATH;
}

export function isInsideFolder(path: string, folder: string): boolean {
  return path.startsWith(`${folder}/`);
}

export function cityFolder(path: string): string | null {
  const segments = path.split("/").filter(Boolean);
  return segments.length >= 3 ? segments[1] : null;
}
