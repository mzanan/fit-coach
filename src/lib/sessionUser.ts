const resolved = new WeakMap<object, Promise<string | null>>();

async function requestHeaders(): Promise<object | null> {
  try {
    const { headers } = await import("next/headers");
    return await headers();
  } catch (error) {
    const { unstable_rethrow } = await import("next/navigation");
    unstable_rethrow(error);
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
