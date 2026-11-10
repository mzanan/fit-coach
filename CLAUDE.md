# CLAUDE.md

Monorepo (pnpm workspace + Turborepo) holding every fit-coach coach variant. Vault: `personal-brain/01-Projects/18-coach-variants/` (variants) and `personal-brain/01-Projects/12-fit-coach/` (v1).

## Layout

- `apps/v1/`: the production coach (Vercel Root Directory). Read its own `CLAUDE.md`, `README.md` and `WORKFLOW.md` before touching it.
- `apps/<variant>/`: one app per variant, each with a doc of its stack and infra.
- `packages/`: code shared by two or more apps (UI, schema, evaluator).

## Commands

- Root `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test` run every app through turbo.
- App-only scripts (`db:*`, `test:db`, `format`): `pnpm --filter @fit-coach/v1 <script>`.
- A change in `packages/` runs root `pnpm test` before merge: it can break apps the change was not written for.

## Dependencies

- A dependency used by two or more apps, or overridden at the root, takes its version from `catalog` in `pnpm-workspace.yaml` (`"zod": "catalog:"`), so one bump updates every app.

## Environment variables

Turborepo strict mode, the official practice (https://turborepo.dev/docs/crafting-your-repository/using-environment-variables).

- Every env var a task reads is declared in that task's `env` in `turbo.json`. Undeclared vars are dropped silently, so the app falls back to `.env.local` (the dev DB). Wildcards allowed (`JEV_*`); `NEXT_PUBLIC_*` is inferred.
- `.env*` files live inside each app, never at the root, and are listed in the task `inputs` so a change invalidates the cache.
- Secrets: Infisical folder `/fit-coach`, `.infisical.json` at the repo root so the CLI works from the root and from any app. Each app keeps its own `.env.local`.
- Never run `vercel env pull`: it writes to the current folder, not to the app, and Sensitive vars come back as placeholders.
- `eslint-config-turbo` (`turbo/no-undeclared-env-vars`) fails lint on an undeclared var. Fix it by declaring the var, never with an `allowList`.
