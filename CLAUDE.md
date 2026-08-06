# CLAUDE.md

Multi-user nutrition + training tracker (PWA) with an AI coach. Vault tracking: `personal-brain/01-Projects/15-fit-coach/`.

Architecture and setup: `README.md`. How the project is built (review gate, architecture-first method, what each lab measured): `WORKFLOW.md`. Read both before changing the AI layer.

## Stack

Next 16 (App Router) + React 19 + Tailwind v4 + shadcn/radix. Turso via Drizzle. Better Auth (Google OAuth primary, email OTP secondary) gated by `src/proxy.ts`. AI: Vercel AI SDK v7 with three separate provider slots, text on per-user BYOK (Groq/OpenRouter/Google, key encrypted per user, no system fallback), vision and embeddings on system Gemini keys. Coach runs the SDK's native tool loop; `log_meal` is the only write and sits behind `toolApproval`. Architecture detail: `README.md`.

## Commands

- `npm run dev` (port 3040), `npm run build`, `npm run lint`, `npm run format`
- `npm run db:generate` / `db:migrate` / `db:studio`

## Structure

- `src/app/(app)/` app routes (today, catalog, coach, workout, settings); `src/app/login/`; `src/app/api/{auth,coach,cron}/`
- `src/components/<feature>/` feature UI + colocated hooks; `src/components/ui/` primitives
- `src/lib/` actions, ai, data, db (schema + drizzle), auth/session, macros/dates helpers
- `src/lib/ai/` provider registry + capability gating (`provider`, `providers`, `registry`, `groqCaps`, `googleCaps`), coach loop + tools (`coach`, `coachTools`), memory (`memory` summary, `facts` + `embeddings`), background maintenance (`maintenance`: daily stale-fact expiry + memory consolidation via `/api/cron/maintenance`), ingestion (`vision`, `inbody`, `mdExtract`, `mdImport`)

## Conventions

Personal engineering standards apply (reuse/SRP/DRY/tokens/server-first, zero code comments, branch per change): see `personal/CLAUDE.md` and `personal-brain/02-Areas/Engineering-standards.md`. Secrets in `.env.local` (template: `.env.example`); never commit values.
