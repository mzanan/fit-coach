export interface ConsentClient {
  name: string;
  redirectHost: string | null;
  scopes: string[];
}

function hostOf(uri: string): string | null {
  try {
    return new URL(uri).host;
  } catch {
    return null;
  }
}

export function describeConsentClient(
  clientId: string,
  scope: string,
  row: { name: string | null; redirectUris: string[] } | null,
): ConsentClient {
  const fallbackName = hostOf(clientId) ?? (clientId || "An application");
  return {
    name: row?.name?.trim() || fallbackName,
    redirectHost: row?.redirectUris[0] ? hostOf(row.redirectUris[0]) : null,
    scopes: scope.split(" ").filter(Boolean),
  };
}
