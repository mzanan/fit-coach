# Fit Coach

Multi-user nutrition and training tracker (installable PWA) with an AI coach that reads the user's own data through tools and can log meals on their behalf behind an explicit confirmation.

Built mobile-first: the core loop is logging a meal from a personal catalog in a few taps, seeing the day's macros against targets, and asking the coach a question that is answered from real rows, not from a pre-assembled text blob.

> **[WORKFLOW.md](./WORKFLOW.md) documents how this was built**: the review process in front of every merge, the experiments run before each architectural decision, what they measured, and the designs that failed. Start there if you care more about the reasoning than the result.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router), React 19, Tailwind v4, Radix primitives |
| Data | Turso (libSQL) + Drizzle ORM |
| Auth | Better Auth: Google OAuth primary, email OTP secondary |
| AI | Vercel AI SDK v7, per-user BYOK across Groq / OpenRouter / Google |
| Hosting | Vercel (`hnd1`, colocated with the Turso region) |

## Running locally

```bash
npm install
cp .env.example .env.local     # every variable is documented inline
npm run db:migrate
npm run dev                    # http://localhost:3040
```

`.env.example` states what each variable is for and which are optional. The app runs without any AI key: the coach degrades to a deterministic rule-based summary and the markdown import is disabled with a CTA.

## Architecture

### Data access

Server-first. Server Components by default, `"use client"` only where there is state or an event handler. Every query and mutation filters by `user_id` explicitly; there is no row-level security backstop, so that filter is a reviewed invariant rather than an enforced one.

A logical-day helper wraps every day-scoped read and write, so a user whose day ends at 04:00 in their own timezone gets their meals grouped the way they actually eat rather than by UTC midnight.

### The AI layer

Three provider slots, deliberately separate because they have different constraints:

- **Text** (coach, extraction): per-user BYOK. The user stores their own provider, API key and model in Settings. Keys are encrypted at rest with AES-256-GCM using a per-user AAD. There is no system-key fallback by design: no AI runs until the user supplies a key, so the app never spends someone else's budget silently.
- **Vision** (InBody scan OCR): a system Gemini key, because it is a fixed pipeline tuned against a real result sheet rather than something the user configures.
- **Embeddings** (long-term memory): also Gemini, because Groq publishes no embedding model. Pinned to `gemini-embedding-001` truncated to 768 dimensions, which must match the `F32_BLOB(n)` column.

Model capability is not uniform and no layer normalizes it, so the app keeps its own capability registry: it reads the provider catalog, marks which models declare tool use and structured output, and gates features per model instead of failing at request time. Models are named where behavior was actually measured rather than inferred from a capability flag, because *declaring* tool support and *choosing to call a write tool when asked* are different things.

### The coach is an agent, not a prompt

The coach runs on the SDK's native tool loop with five tools: `get_today`, `search_catalog`, `log_meal`, `get_workouts`, `get_body_scans`. The model decides which to call; the app does not pre-assemble context.

`log_meal` is the only write, and it is gated by the SDK's `toolApproval`. The flow matters:

1. The model proposes a write. The loop pauses and the request is emitted over the same ndjson stream the answer uses, so the serverless function exits instead of holding a connection open waiting for a human.
2. **Macros are resolved server-side before the pause.** The confirmation card renders from a server preview keyed by catalog id, never from the model's arguments, so the numbers a user confirms are the catalog's numbers.
3. The paused state lives in a database row, one per user, deleted on resolve. This is a phone PWA: the tab can be backgrounded between the proposal and the confirmation, which is exactly where client-held pending state is lost.
4. Confirmation is a second request carrying only `{approvalId, approved}`.

Where a prompt rule proved insufficient, the rule moved into code. The model choosing a portion size on its own became an app-rendered size picker whose choice is applied at the tool's `execute()`; the model claiming a write it never performed became an app-side check against whether the tool actually ran.

### Memory

Three stores, each solving a different problem:

| Store | Shape | Purpose |
|---|---|---|
| `coach_messages` | Full turns, verbatim (a turn interrupted before it finished keeps a placeholder instead) | Conversation continuity. The last N turns go into every call. |
| `coach_memory` | One rolling ~150-word summary per user | Cheap always-on context that survives clearing the chat and works without an embeddings key. |
| `coach_facts` | Discrete facts, one row each, with a 768-dim embedding | Durable preferences, constraints, corrections and routines, retrieved by cosine similarity. |

`coach_facts` retrieval uses libSQL's native `vector_distance_cos` with thresholds calibrated against measured distances (retrieval 0.45, semantic dedup 0.06). It filters by `user_id` and then scans rather than using an ANN index, because libSQL's `vector_top_k` is global and would leak or drop rows across users.

**Supersession.** A vector store models similarity, not time: two facts stored months apart rank identically if the text matches, so a correction used to sit alongside the belief it replaced and both could be retrieved. Facts therefore carry a `subject`, a normalized key naming *what the fact is about* (`salmon`, `training_time`). A new fact deactivates every active fact sharing its subject, inside a transaction, and retrieval only reads active rows. Superseded rows are retained with a `superseded_by` pointer rather than deleted, so the chain stays auditable.

The invariant is *at most one active fact per (user, subject)*, and it is enforced twice: in code, where the semantic-dedup path is scoped to the same subject so it can never merge two different topics into one row, and in the schema, by a partial unique index that makes the invalid state unrepresentable regardless of what the code does. Facts with no subject are exempt from both, which is what lets rows written before this shipped keep working unchanged.

The decisive detail is that the model is asked what a fact is *about*, never whether it *contradicts* something. An isolated experiment measured that similarity alone cannot carry that decision: genuine same-topic contradictions landed between 0.1152 and 0.2056 cosine distance, while a genuinely unrelated pair landed at 0.1754, inside that range. No threshold separates the two classes, so the resolution is an exact key match with no distance involved.

### Background maintenance

Until now, nothing in this app ran unless a user sent a chat message: the per-turn memory refresh and fact extraction both fire from inside a request. A daily Vercel Cron (`/api/cron/maintenance`, `CRON_SECRET`-gated) now does two things that need to happen whether or not the user is active:

- **Stale-fact cleanup.** A `coach_facts` row untouched for 30+ days gets deactivated, same code path as supersession. `category = 'correction'` is exempt: a correction is defined as the thing that matters most, so it never silently expires just because the user hasn't repeated it.
- **Memory consolidation.** `coach_memory` re-grounds from the user's active facts and recent logged data (targets, today's meals, the week's protein hit-rate, Whoop, latest scan), so it doesn't drift stale for a user who logs data without chatting. This merges into the existing memory rather than replacing it: the model is told what changed, not asked to reconstruct the summary from scratch, since facts and structured data cannot capture everything a conversation accumulates.

Both run per-user through the same BYOK model reference every other AI call uses; a user with no saved key is skipped, not defaulted to a system key. The trigger itself (plain Vercel Cron over Workflow DevKit and Inngest) was chosen in an isolated lab, same method as everything else in this section.

## Method

Components that can be built more than one way get an isolated experiment before they touch this repo, kept in a separate `labs` repository: the provider abstraction, the tool loop, human-in-the-loop approval, and the memory supersession question above were each measured before being integrated. Several findings only surfaced that way, including that one free model never calls a write tool at all under a prompt that makes two others call it reliably.

Every change that touches logic goes through two review agents in parallel before merge, one attacking the new code and one guarding the existing flows.

[WORKFLOW.md](./WORKFLOW.md) is the full record: both phases of how the project has been built, the bugs the review gate caught before they reached `main`, what each experiment measured, and the design that passed its lab and still failed in production.

## Known gaps

- **No automated test suite.** Verification today is typecheck, lint, build, the review gates, and manual runtime checks against the real database. The first unit targets would be the pure logic already isolated in `src/lib` (`dates`, `macros`, `search`).
- **Whoop integration is code-complete but never exercised at runtime**, blocked on hardware rather than credentials.
- **Coach replies can truncate silently** on reasoning models, where hidden reasoning tokens consume the same output budget as the answer. Diagnosed, not yet fixed.
- Facts written before supersession shipped carry no `subject` and are never superseded; they age out only by the semantic dedup path.
