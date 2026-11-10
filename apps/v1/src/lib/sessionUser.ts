const resolved = new WeakMap<object, Promise<string | null>>();
let warnedOutsideRequest = false;

function warnOutsideRequest(error: unknown) {
  if (warnedOutsideRequest) return;
  warnedOutsideRequest = true;
  console.warn("[db] query outside a request and without a user context; it reads nothing under row level security", error);
}

async function requestHeaders(): Promise<object | null> {
  try {
    const { headers } = await import("next/headers");
    return await headers();
  } catch (error) {
    const { unstable_rethrow } = await import("next/navigation");
    unstable_rethrow(error);
    warnOutsideRequest(error);
    return null;
  }
}

async function lookupUserId(): Promise<string | null> {
  const { getUser } = await import("@/lib/session");
  return (await getUser())?.id ?? null;
}

export async function sessionUserId(): Promise<string | null> {
  const headers = await requestHeaders();
  if (!headers) return null;
  let pending = resolved.get(headers);
  if (!pending) {
    pending = lookupUserId();
    resolved.set(headers, pending);
    pending.catch(() => resolved.delete(headers));
  }
  return pending;
}
