import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { auth } from "@/lib/auth";
import { getUserEmail } from "@/lib/data/mcpUser";
import { parseAllowedEmails } from "@/lib/mcp/access";
import { MCP_CHALLENGE_SCOPES, MCP_REQUIRED_SCOPES, MCP_RESOURCE } from "@/lib/mcp/config";
import { buildFitCoachServer } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const allowedEmails = parseAllowedEmails(process.env.MCP_ALLOWED_EMAILS);

export const POST = requireMcpAuth(
  auth,
  async (request, claims) => {
    const userId = typeof claims.sub === "string" ? claims.sub : null;
    const email = userId ? await getUserEmail(userId) : null;
    if (!userId || !email || !allowedEmails.has(email.toLowerCase())) {
      return Response.json(
        { jsonrpc: "2.0", id: null, error: { code: -32001, message: "This account is not enabled for the Fit Coach MCP server." } },
        { status: 403 },
      );
    }
    const handler = createMcpHandler(() => buildFitCoachServer(userId), { legacy: "stateless" });
    return handler.fetch(request);
  },
  {
    resource: MCP_RESOURCE,
    requiredScopes: [...MCP_REQUIRED_SCOPES],
    challengeScopes: [...MCP_CHALLENGE_SCOPES],
  },
);
