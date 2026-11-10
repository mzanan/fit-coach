export interface ActionFailure {
  ok: false;
  error: string;
}

export function fail(error: string): ActionFailure {
  return { ok: false, error };
}

export function isActionFailure(value: unknown): value is ActionFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { ok?: unknown }).ok === false &&
    typeof (value as { error?: unknown }).error === "string"
  );
}

export function unwrap<T>(value: T | ActionFailure): T {
  if (isActionFailure(value)) throw new Error(value.error);
  return value;
}
