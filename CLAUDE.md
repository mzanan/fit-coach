# CLAUDE.md

Multi-user nutrition + training tracker (PWA) with an AI coach. Vault tracking: `personal-brain/01-Projects/15-fit-coach/`.

## Stack

Next 16 (App Router) + React 19 + Tailwind v4 + shadcn/radix. Turso via Drizzle. Better Auth (email OTP) gated by `src/proxy.ts`. AI coach: Groq (Llama) through the OpenAI-compatible client in `lib/ai/`.

## Commands

- `npm run dev` (port 3040), `npm run build`, `npm run lint`, `npm run format`
- `npm run db:generate` / `db:migrate` / `db:studio`

## Structure

- `src/app/(app)/` app routes (today, catalog, coach, workout, settings); `src/app/login/`; `src/app/api/{auth,coach}/`
- `src/components/<feature>/` feature UI + colocated hooks; `src/components/ui/` primitives
- `src/lib/` actions, ai, data, db (schema + drizzle), auth/session, macros/dates helpers

## Conventions

Personal engineering standards apply (reuse/SRP/DRY/tokens/server-first, zero code comments, branch per change): see `personal/CLAUDE.md` and `personal-brain/02-Areas/Engineering-standards.md`. Secrets in `.env.local` (template: `.env.example`); never commit values.
