# Fit Coach

Multi-user nutrition and training tracker (installable PWA) with an AI coach that reads the user's own data through tools and can log meals on their behalf behind an explicit confirmation.

Built mobile-first: the core loop is logging a meal from a personal catalog in a few taps, seeing the day's macros against targets, and asking the coach a question that is answered from real rows, not from a pre-assembled text blob.

> **[WORKFLOW.md](./WORKFLOW.md) documents how this was built**: the review process in front of every merge, the experiments run before each architectural decision, what they measured, the designs that failed, and the implementation details this README leaves out.

## Stack

| Layer   | Choice                                                                                |
| ------- | ------------------------------------------------------------------------------------- |
| App     | Next.js 16 (App Router), React 19, Tailwind v4, Radix primitives                      |
| Data    | Turso (libSQL) + Drizzle ORM                                                          |
| Auth    | Better Auth: Google OAuth primary, email OTP secondary                                |
| AI      | Vercel AI SDK v7, per-user BYOK across Groq / OpenRouter / Google / Experiential Labs |
| Hosting | Vercel (`hnd1`, colocated with the Turso region)                                      |

## Running locally

```bash
npm install
cp .env.example .env.local     # every variable is documented inline
npm run db:migrate
npm run dev                    # http://localhost:3040
npm test                       # unit specs (Vitest)
```

The app runs without any AI key: the coach degrades to a deterministic rule-based summary and the markdown import is disabled with a CTA.

## Architecture

### Data access

Server Components by default, `"use client"` only where there is state or an event handler. Every query and mutation filters by `user_id` explicitly; there is no row-level security backstop, so that filter is a reviewed invariant rather than an enforced one. A logical-day helper wraps every day-scoped read and write, so a user whose day ends at 04:00 in their own timezone gets their meals grouped the way they actually eat rather than by UTC midnight.

### The AI layer

Three provider slots, deliberately separate because they have different constraints:

- **Text** (coach, extraction): per-user BYOK, keys encrypted at rest with AES-256-GCM and a per-user AAD. No system-key fallback: no AI runs until the user supplies a key, so the app never spends someone else's budget silently.
- **Vision** (InBody scan OCR): a system Gemini key, because it is a fixed pipeline tuned against a real result sheet.
- **Embeddings** (long-term memory): Gemini `gemini-embedding-001` at 768 dimensions, app infrastructure outside BYOK. Every `coach_facts` row stamps which model built its vector, so a future re-embed job can tell what it is looking at.

Model capability is not uniform, so the app keeps its own capability registry: it reads the provider catalog, marks which models declare tool use and structured output, and gates features per model instead of failing at request time.

### The coach is an agent, not a prompt

The coach runs on the SDK's native tool loop with read tools (`get_current_time`, `get_today`, `search_catalog`, `get_workouts`, `get_body_scans`, `get_progress_overview`, `check_progression_eligible`) plus writes. The model decides which to call; the app does not pre-assemble context.

- **Additive writes** (`log_meal`, `log_estimated_meal`, `update_rule`, `log_fatigue`, `log_workout_session`, `log_measurement`) run directly, and the reply shows a receipt of what was saved.
- **Writes that close the day or change targets** (`close_day`, `set_targets`) pause for a confirmation card through the SDK's `toolApproval`. The pause is emitted over the answer's ndjson stream so the serverless function exits; the card's macros are resolved server-side from the catalog, never from the model's arguments; the pending state lives in a database row, so a backgrounded PWA tab does not lose it.
- **Capability gate.** Writes are only registered for models whose catalog declares tool support (`canWriteMeals`); any other model is told to send the user to manual logging.
- **Optional decision gate.** With `JEV_API_KEY` set, each direct write is checked by TypeSafe Jev, a typed decision model, which runs it, refuses it, or falls back to the confirmation card. Calibrated first in the `labs` repository (`p10-jev-tool-gate`).

Where a prompt rule proved insufficient, the rule moved into code: the model choosing a portion size became an app-rendered size picker, and the model claiming a write it never performed became an app-side check against whether the tool actually ran.

A per-user cap of 30 coach turns per rolling hour guards against a stuck loop spending unboundedly; the tool-loop and retry limits are named constants in `src/lib/ai/limits.ts`.

The answer is server-owned, not tied to the request that started it: a refresh or a dropped connection does not kill the generation, its partial text is written to the row every second so a reload picks it up mid-answer, and Stop is its own request (`/api/coach/stop`).

### Memory

Three stores, each solving a different problem:

| Store            | Shape                                                     | Purpose                                                                                      |
| ---------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `coach_messages` | Full turns; a row mid-generation carries its partial text | Conversation continuity. The last N turns go into every call.                                |
| `coach_memory`   | One rolling ~150-word summary per user                    | Cheap always-on context that survives clearing the chat and works without an embeddings key. |
| `coach_facts`    | Discrete facts, one row each, with a 768-dim embedding    | Durable preferences, constraints, corrections and routines, retrieved by cosine similarity.  |

`coach_facts` retrieval uses libSQL's native `vector_distance_cos` with thresholds calibrated against measured distances (retrieval 0.45, semantic dedup 0.06). It filters by `user_id` and then scans rather than using an ANN index, because libSQL's `vector_top_k` is global and would leak or drop rows across users.

**Supersession.** A vector store models similarity, not time, so without a time model a correction would be retrieved alongside the belief it replaced. Facts carry a `subject`, a normalized key naming _what the fact is about_ (`salmon`, `training_time`). A new fact deactivates every active fact with the same subject inside a transaction; the old row is kept with a `superseded_by` pointer. _At most one active fact per (user, subject)_ is enforced in code and by a partial unique index.

The model is asked what a fact is _about_, never whether it _contradicts_ something, because a lab showed similarity cannot carry that decision: same-topic contradictions landed between 0.1152 and 0.2056 cosine distance, and an unrelated pair at 0.1754, inside that range.

### Background jobs

- **Daily maintenance** (Vercel Cron, `/api/cron/maintenance`, `CRON_SECRET`-gated): deactivates facts untouched for 30+ days (corrections exempt) and re-grounds `coach_memory` from active facts and recent logged data, merging into the existing summary instead of rewriting it. Runs per user on their own BYOK model; users without a key are skipped.
- **Markdown import** (Vercel Workflow DevKit): a long multi-step extraction that survives the tab closing, timeouts and crashes, retries rate-limited chunks honoring `retry-after`, and lets the import screen reattach to a run still in progress. A run owned by another user returns 404.

Each job's runtime was chosen in an isolated lab: durability is worth an SDK for the long import and worth nothing for a single-step nightly job.

### Observability

The AI layer logs its own behavior to an `ai_events` table, readable under Settings > AI > Activity: rate limits, turn caps, repaired tool calls, maintenance runs, and one `exchange` event per coach answer with the model, a hash of the system prompt and the token usage. Outside production it also stores the full prompt, so a "the model ignored X" report can be answered by reading what was actually sent.

## Method

Components that can be built more than one way get an isolated experiment in a separate `labs` repository before they touch this one: the provider abstraction, the tool loop, human-in-the-loop approval and memory supersession were each measured before being integrated. Some findings only surfaced that way, including that one free model never calls a write tool under a prompt that makes two others call it reliably.

Every change that touches logic goes through two review agents in parallel before merge, one attacking the new code and one guarding the existing flows.

## Known gaps

- **Unit coverage is thin.** Vitest covers the pure logic in `src/lib` (`dates`, `macros`, `inbodyChecks`, `exercises`, `search`); everything stateful relies on typecheck, lint, build, the review gates and manual checks against the real database.
- **Truncated replies on the streaming path.** A cut reply is continued server-side and a continuation that restarts the answer is discarded, but already-streamed text cannot be reset, so the reply stays cut at the truncation point.
- **`/api/coach/approve` is still request-bound.** Unlike `/api/coach`, a dropped connection cancels the write-confirmation flow.
- Facts written before supersession shipped carry no `subject` and are never superseded; they age out only by the semantic dedup path.
