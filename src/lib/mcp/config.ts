const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3040";

export const MCP_RESOURCE = new URL("/api/mcp", baseUrl).toString();

export const MCP_SCOPES = ["openid", "profile", "email", "offline_access", "fitcoach"] as const;

export const MCP_REQUIRED_SCOPES = ["fitcoach"] as const;
