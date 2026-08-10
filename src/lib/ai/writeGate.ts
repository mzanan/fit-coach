// Adding a model here requires a lab run (see lab p1b-tool-approval), never a capability flag.
export const WRITE_MEASURED_MODELS = new Set([
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-20b:free",
]);

export function canWriteMeals(model: string): boolean {
  return WRITE_MEASURED_MODELS.has(model);
}
