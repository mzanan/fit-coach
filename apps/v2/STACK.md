# v1 stack

Baseline for comparing coach variants. Verified against the code on 2026-11-10.

## App

| Piece | Technology |
| --- | --- |
| Framework | Next.js 16.4 (App Router), React 19.2, TypeScript |
| UI | Tailwind v4, shadcn/ui over Radix, vaul drawers, sonner toasts, lucide icons |
| Forms | react-hook-form + zod 4 |
| PWA | Installable, service worker, web push (`web-push`, VAPID keys) |

## Data

| Piece | Technology |
| --- | --- |
| Database | Postgres on Neon, region aws-ap-southeast-1; `dev` branch for local, `main` for prod |
| ORM | Drizzle (`node-postgres` Pool), migrations in `drizzle/migrations` |
| Isolation | Row-level security forced on every user table; app connects as `app_rw` without BYPASSRLS |
| Audit | Trigger writes every change to `write_changes`; Claude and coach writes grouped in `write_ledger` |

## Auth

| Piece | Technology |
| --- | --- |
| Users | Better Auth with Google OAuth, gated by `src/proxy.ts` |
| MCP clients | Better Auth `mcp` plugin as OAuth server, limited to `MCP_ALLOWED_EMAILS` |

## AI

| Piece | Technology |
| --- | --- |
| SDK | Vercel AI SDK 7, native tool loop |
| Coach model | Per-user BYOK: Groq, OpenRouter, Google or the Experiential Labs gateway (Matias uses claude-haiku-5.5) |
| Tool gate | Jev judge model (`typesafe/jev-1.13` via OpenRouter) checks additive writes before they run |
| Confirmations | `close_day` and `set_targets` pause for a confirmation card |
| Memory | `user_facts` table, one row per fact, up to 150 facts injected into the system prompt every turn |
| Catalog search | No vectors; the model translates and searches the English catalog itself |
| Vision | Gemini (`gemini-3.6-flash`) on a system key, InBody scans only; no meal photo logging |
| Durable jobs | Workflow DevKit (`workflow` 5.4) for the markdown history import |

## Integrations

| Piece | Technology |
| --- | --- |
| Remote MCP | `/api/mcp` (`mcp-handler`, `@modelcontextprotocol/server`), used from claude.ai |
| Analytics | PostHog EU behind the `/relay` proxy, cookie consent with cookieless fallback |

## Infra

| Piece | Technology |
| --- | --- |
| Hosting | Vercel, region `sin1`, Root Directory `apps/v2` |
| Cron | Vercel cron `/api/cron/maintenance` daily at 00:00 UTC |
| Secrets | Infisical folder `/fit-coach` (dev, prod); runtime values in Vercel env |
| Monorepo | pnpm 10 workspace + Turborepo 2 (strict env mode) |
| Tests | Vitest unit specs; DB specs against the Neon `dev` branch |
