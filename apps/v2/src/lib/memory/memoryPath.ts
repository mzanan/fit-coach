import { MEMORY_INDEX_PATH, MEMORY_PATH_MAX, MEMORY_ROOT } from "@/lib/constants";

export type MemoryPathResult = { ok: true; path: string } | { ok: false; error: string };

const ROOT_SEGMENT = MEMORY_ROOT.slice(1);

function decodedPath(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

export function normalizeMemoryPath(raw: string): MemoryPathResult {
  const value = decodedPath(raw.trim());
  if (value === null || value.includes("\\") || value.includes("\0")) {
    return { ok: false, error: `Error: Invalid path ${raw}` };
  }
  const segments = value.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return { ok: false, error: `Error: Path ${raw} must not contain . or .. segments` };
  }
  if (!value.startsWith("/") || segments[0] !== ROOT_SEGMENT) {
    return { ok: false, error: `Error: Path ${raw} must start with ${MEMORY_ROOT}` };
  }
  const path = `/${segments.join("/")}`;
  if (path.length > MEMORY_PATH_MAX) {
    return { ok: false, error: `Error: Path ${raw} is longer than ${MEMORY_PATH_MAX} characters` };
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

export function movedPath(path: string, from: string, to: string): string {
  return path === from ? to : `${to}${path.slice(from.length)}`;
}
