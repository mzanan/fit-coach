# CLAUDE.md

Multi-user nutrition + training tracker (PWA) with an AI coach. Vault tracking: `personal-brain/01-Projects/15-fit-coach/`.

Architecture and setup: `README.md`. How the project is built (review gate, architecture-first method, what each lab measured): `WORKFLOW.md`. Read both before changing the AI layer.

## Stack

Next 16 (App Router) + React 19 + Tailwind v4 + shadcn/radix. Turso via Drizzle. Better Auth (Google OAuth primary, email OTP secondary) gated by `src/proxy.ts`, whose matcher excludes `.well-known/workflow/` so the Workflow DevKit's internal routes are not redirected to `/login`. AI: Vercel AI SDK v7 with three separate provider slots, text on per-user BYOK (Groq/OpenRouter/Google, key encrypted per user, no system fallback), vision and embeddings on system Gemini keys. Coach runs the SDK's native tool loop; `log_meal`, `update_rule` and `log_fatigue` are the writes and all three sit behind `toolApproval`. Architecture detail: `README.md`.

## Commands

- `npm run dev` (port 3040), `npm run build`, `npm run lint`, `npm run format`
- `npm run test` (vitest), `npm run db:generate` / `db:migrate` / `db:studio`, `npm run db:seed-exercises` (imports the exercise catalog via `scripts/importExerciseCatalog.ts`)

## Structure

- `src/app/(app)/` app routes (today, catalog, coach, workout, settings); `src/app/login/`; `src/app/api/{auth,coach,cron,import,push,whoop}/`
- `src/components/<feature>/` feature UI + colocated hooks; `src/components/ui/` primitives
- `src/lib/` actions, ai, data, db (schema + drizzle), auth/session, macros/dates helpers, `integrations/` (Whoop client + credential crypto, runtime never exercised). `src/hooks/` cross-feature hooks, `src/types/` ambient declarations. `ai/aiCredentials.ts`, `ai/capabilities.ts` (model catalogs) and `data/catalog.ts` call `unstable_cache`, so `lib/` is coupled to the Next.js runtime and not portable as-is.
- `src/lib/data/importRuns.ts` maps a workflow run id to its owner and answers which run a returning user can rejoin; `src/lib/importStream.ts` is the client side of start/stream/cancel/forget and `src/lib/importPreview.ts` maps an extraction to the review rows; the SDK writes its internal routes into `src/app/.well-known/workflow/` at build time (generated, gitignored)
- `src/lib/ai/` model calls (`provider`), per-user credentials (`aiCredentials`), capability gating + model catalogs (`capabilities`, merging the old registry/groqCaps/googleCaps), coach turn orchestration (`coach`, prompt text in `coachPrompt`, context/snapshot building in `coachContext`, the write-approval flow in `coachApproval`), tools (`coachTools` + catalog search/ranking in `coachCatalogSearch`, `writeGate` for the write blocklist, with the capability-derived gate itself in `capabilities`), spend/abuse constants (`limits`: turn cap, tool-step cap, continuation-retry cap), memory (`memory` summary, `facts` + `embeddings`), background maintenance (`maintenance`: daily stale-fact expiry + memory consolidation via `/api/cron/maintenance`), ingestion (`vision`, `inbody`, `mdExtraction` pure schema/chunk/merge, `mdImport` per-chunk model call, `mdImportWorkflow` the durable import run)

## Conventions

Personal engineering standards apply (reuse/SRP/DRY/tokens/server-first, zero code comments, branch per change): see `personal/CLAUDE.md` and `personal-brain/02-Areas/Engineering-standards.md`. Secrets in `.env.local` (template: `.env.example`), backed up in Infisical folder `/fit-coach` (envs `dev`/`prod`, `.infisical.json` committed); never commit values.

Prod migrations: source the prod Turso credentials explicitly from Infisical (env `prod`); never let drizzle fall back to `.env.local` (that is dev). Echo the resolved target DB host/URL before running the migration and confirm it is prod. If prod credentials are missing, abort instead of continuing on the fallback.
