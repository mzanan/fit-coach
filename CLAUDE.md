# CLAUDE.md

Multi-user nutrition + training tracker (PWA) with an AI coach. Vault tracking: `personal-brain/01-Projects/12-fit-coach/`.

Architecture and setup: `README.md`. How the project is built (review gate, architecture-first method, what each lab measured): `WORKFLOW.md`. Read both before changing the AI layer.

## Stack

Next 16 (App Router) + React 19 + Tailwind v4 + shadcn/radix. Turso via Drizzle. Better Auth (Google OAuth) gated by `src/proxy.ts`, whose matcher excludes `.well-known/workflow/` so the Workflow DevKit's internal routes are not redirected to `/login`. Anonymous requests for `/` are rewritten to the static public landing (`src/app/landing/`); direct `/landing` hits redirect to `/`. AI: Vercel AI SDK v7 with three separate provider slots, text on per-user BYOK (Groq/OpenRouter/Google/Experiential Labs, key encrypted per user, no system fallback), vision and embeddings on system Gemini keys. Coach runs the SDK's native tool loop. Additive writes (`log_meal`, `log_estimated_meal`, `update_rule`, `log_fatigue`, `log_workout_session`, `log_measurement`) run directly and show a receipt, optionally judged first by the Jev tool gate (`JEV_API_KEY`); `close_day` and `set_targets` always pause for a confirmation card via `toolApproval`. Architecture detail: `README.md`.

## Commands

- `npm run dev` (port 3040), `npm run build`, `npm run lint`, `npm run format`
- `npm run test` (vitest), `npm run db:generate` / `db:migrate` / `db:studio`, `npm run db:seed-exercises` (imports the exercise catalog via `scripts/importExerciseCatalog.ts`)

## Structure

- `src/app/(app)/` app routes (today, catalog, coach, workout, routine, body, settings); `src/app/login/`; `src/app/privacy/` (public, sections via `components/legal/LegalSection`); `src/app/landing/` + `src/components/landing/` (public landing, demo values in `src/lib/landingDemo.ts`); `src/app/api/{auth,coach,cron,import,push}/`. Every public page links the privacy policy and the itsmatias credit.
- `src/components/shell/`: mobile bottom `NavBar`; desktop `AppHeader` top bar + collapsible `SideNav` rail (`RailShell`/`useRail`, state persisted in the `rail_collapsed` cookie via `lib/railCookie.ts` so the server renders the right width)
- Analytics: PostHog EU through the `/relay` rewrite (`lib/analytics.ts`, `src/instrumentation-client.ts`), production only. Cookie consent banner (`components/consent`, `lib/consent.ts`) with `cookieless_mode: "on_reject"`; identify only after consent. `?notrack=1` opts a browser out (localStorage), `?notrack=0` opts back in. SEO/AEO baseline in `app/{sitemap,robots}.ts` + `lib/seo.ts`.
- `src/components/<feature>/` feature UI + colocated hooks; `src/components/ui/` primitives (they encode radius/padding via props such as Surface `pad`; an ESLint `no-restricted-syntax` rule rejects `rounded-*`/`p-*` className overrides on them)
- `src/lib/` actions, ai, data, db (schema + drizzle), auth/session, macros/dates helpers, `integrations/` (credential crypto). `src/hooks/` cross-feature hooks, `src/types/` ambient declarations. `ai/aiCredentials.ts`, `ai/capabilities.ts` (model catalogs) and `data/catalog.ts` call `unstable_cache`, so `lib/` is coupled to the Next.js runtime and not portable as-is.
- `src/lib/data/importRuns.ts` maps a workflow run id to its owner and answers which run a returning user can rejoin; `src/lib/importStream.ts` is the client side of start/stream/cancel/forget and `src/lib/importPreview.ts` maps an extraction to the review rows; the SDK writes its internal routes into `src/app/.well-known/workflow/` at build time (generated, gitignored)
- `src/lib/ai/` model calls (`provider`), per-user credentials (`aiCredentials`), capability gating + model catalogs (`capabilities`, merging the old registry/groqCaps/googleCaps), coach turn orchestration (`coach`, prompt text in `coachPrompt`, context/snapshot building in `coachContext`, the write-approval flow in `coachApproval`), tools (`coachTools` + catalog search/ranking in `coachCatalogSearch`, `writeGate` for the write blocklist, with the capability-derived gate itself in `capabilities`), spend/abuse constants (`limits`: turn cap, tool-step cap, continuation-retry cap), memory (`memory` summary, `facts` + `embeddings`), background maintenance (`maintenance`: daily stale-fact expiry + memory consolidation via `/api/cron/maintenance`), ingestion (`vision`, `inbody`, `mdExtraction` pure schema/chunk/merge, `mdImport` per-chunk model call, `mdImportWorkflow` the durable import run)

## Conventions

Personal engineering standards apply (reuse/SRP/DRY/tokens/server-first, zero code comments, branch per change): see `personal/CLAUDE.md` and `personal-brain/02-Areas/Engineering-standards.md`. Secrets in `.env.local` (template: `.env.example`), backed up in Infisical folder `/fit-coach` (envs `dev`/`prod`, `.infisical.json` committed); never commit values.

Prod migrations: source the prod Turso credentials explicitly from Infisical (env `prod`); never let drizzle fall back to `.env.local` (that is dev). Echo the resolved target DB host/URL before running the migration and confirm it is prod. If prod credentials are missing, abort instead of continuing on the fallback.
