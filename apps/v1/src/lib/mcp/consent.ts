import "server-only";

import { eq } from "drizzle-orm";

import { authDb, schema } from "@/lib/db";
import { describeConsentClient, type ConsentClient } from "@/lib/mcp/consentClient";

export async function getConsentClient(
  params: Record<string, string | string[] | undefined>,
): Promise<ConsentClient> {
  const clientId = typeof params.client_id === "string" ? params.client_id : "";
  const scope = typeof params.scope === "string" ? params.scope : "";
  const [row] = clientId
    ? await authDb
        .select({ name: schema.oauthClient.name, redirectUris: schema.oauthClient.redirectUris })
        .from(schema.oauthClient)
        .where(eq(schema.oauthClient.clientId, clientId))
        .limit(1)
    : [];
  return describeConsentClient(clientId, scope, row ?? null);
}
