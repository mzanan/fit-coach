export const EXERCISE_DATASET_REF = "7455efae41b330c265e7cd4b78dfa848e7ce5ebd";

const EXERCISE_MEDIA_BASE_URL = `https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@${EXERCISE_DATASET_REF}/`;

export const EXERCISE_MEDIA_ATTRIBUTION = "Exercise animations by Gym Visual, gymvisual.com";

export function exerciseGifUrl(gifPath: string): string {
  return `${EXERCISE_MEDIA_BASE_URL}${gifPath}`;
}

export function formatExerciseMeta(
  equipment: string | null,
  target: string | null,
): string | undefined {
  return [equipment, target].filter(Boolean).join(" · ") || undefined;
}
