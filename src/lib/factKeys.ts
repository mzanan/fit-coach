export const FACT_SUBJECT_MAX = 60;

function slug(value: string, keep: RegExp): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(keep, "_")
    .replace(/^_+|_+$/g, "");
}

export function factSubject(value: string | null | undefined): string | null {
  if (!value) return null;
  return slug(value, /[^\p{L}\p{N}]+/gu).slice(0, FACT_SUBJECT_MAX) || null;
}

export function factScope(value: string | null | undefined): string | null {
  if (!value) return null;
  return slug(value, /[^\p{L}\p{N}:]+/gu).replace(/_*:_*/g, ":") || null;
}
