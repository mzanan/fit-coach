# Agentic workflow review: fit-coach redesign (PR #6-#13)

This document records the working process used to build fit-coach's PR #6
through #13 (2026-07-27), from the point an adversarial-review gate was
introduced into the flow through the close of the full UI redesign backlog.
It exists to make the process auditable: what agents were used, what they
were asked to do, what decisions were made and by whom, and what the gate
actually caught before code reached `main`.

All facts below are taken directly from the project vault log
(`personal-brain/01-Projects/15-fit-coach/tasks.md`) and this repo's commit
history. Nothing here is reconstructed from memory.

## The problem this process addresses

Before 2026-07-27, PRs were reviewed by a single pass: write code, run
`tsc`/`lint`/`build`, optionally run a `personal-standards-reviewer` agent
for code-standard conformance, then merge on the developer's own read of the
diff. That catches type errors and style drift. It does not catch behavior:
whether the new code actually survives bad input, and whether it actually
leaves old flows working. Both classes of bug had shipped before under
that process.

## The roles

Four distinct agents are used, each with a single job and no overlap:

| Agent | Job | Output |
|---|---|---|
| `ui-designer` | Owns UI/UX decisions for a screen or flow. Reads the current code and design tokens, proposes an implementable spec (layout, hierarchy, states, tokens, motion, accessibility). Never writes code. | A written spec, reviewed by the developer before implementation starts. |
| `personal-standards-reviewer` | Checks a diff against the repo's engineering standards (reuse, SRP, DRY, design tokens, file structure). | Pass/fail against a fixed checklist. |
| `adversarial-reviewer` | Given a diff and the claim of what it does, tries to break it: bad input, stale state, race conditions, missing auth checks, silent data loss. | Ranked list of break scenarios, each CONFIRMED (reproduced by reading the code path) or PLAUSIBLE (a real risk not fully traced). |
| `regression-scanner` | Given the same diff, maps its blast radius (every file, prop and shared component it touches) and verifies every existing caller and flow still behaves as it did before. | Per-flow verdict: INTACT / BROKEN / AT-RISK. |

`adversarial-reviewer` and `regression-scanner` are deliberately two
separate agents run in parallel, not one combined reviewer. One attacks the
new code, the other guards the old code; asking a single reviewer to hold
both postures at once produces weaker findings on both.

**Gate policy:** a CONFIRMED adversarial finding or a BROKEN regression
blocks the merge until it is fixed. PLAUSIBLE and AT-RISK findings are
reported and either fixed proactively or explicitly deferred, never
silently dropped. This is enforced as a working discipline (the agents are
run before every merge in this branch of the project), not by a CI gate;
there is no automated test suite backing this repo yet.

## Branching discipline

Every screen or feature in the redesign got its own branch, its own PR,
and its own gate run, never bundled. The reasoning, tested in practice: if
the gate finds a CONFIRMED bug in one screen's PR, that PR is blocked, but
the other five screens already shipped are unaffected. A single
"redesign everything" PR would have meant one bug anywhere blocking the
whole backlog, and a much larger diff for the gate agents to reason about
(larger diffs produce weaker, less specific findings).

## Chronological log

### Gate design, 2026-07-27 11:00 ICT

Decided and built the same session, immediately before PR #6: two
standalone Sonnet-model agents (`adversarial-reviewer`,
`regression-scanner`) created as reusable subagents, gate policy written
into the project's engineering standards. Deliberately kept independent
from the existing `/ship-pr` merge-mechanics command rather than wired into
it, so the two remain separately invokable.

### PR #6, vision provider swap (Gemini), 2026-07-27 11:47 ICT

First run of the gate on this repo. `adversarial-reviewer` returned 4
findings: 3 CONFIRMED (no cross-provider key fallback, a stale Infisical
model name, non-actionable extraction error messages), all fixed before
push. 1 was tested live and refuted (a concern about `reasoning_effort:
"none"` compatibility with Gemini, verified by calling the API directly).
`regression-scanner` confirmed old flows intact.

### PR #7, full UI redesign + Body dashboard, 2026-07-27 15:03 ICT

**Design process.** The user's first framing was blunt: "quiero cambiar la
ui del proyecto, no me gusta nada" (I want to change the UI, I don't like
any of it). A `ui-designer` agent was created for this specifically,
spec-only, never code, so design judgment stays a distinct step from
implementation.

The first design pass was rejected outright by the user after seeing it
running: it changed the dark background (which the user explicitly liked)
and introduced green/teal as a primary color. That work was reverted before
ever being pushed (a hard reset on an unpushed commit, no shared state was
touched). The agent was re-briefed with hard constraints: do not touch the
dark background, no green, direction "expensive, aesthetic, premium"
referenced against Whoop, Linear and Teenage Engineering. The second pass
was accepted and implemented: a monochrome system with one brass accent
color, used only in five deliberate places (active nav tab, focus ring,
protein progress bar, attention pills).

**What shipped.** Dark/light theme toggle, new design tokens, avatar with
dropdown user menu, a responsive dialog primitive (drawer on mobile,
centered modal on desktop) replacing the previous mobile-only sheet in 5
components, and a new `/body` composition dashboard (0/1/2+ scan states
with delta and verbal verdict).

**Gate findings, all fixed pre-merge:** invisible button text (a
`tailwind-merge` config gap was treating custom text-size tokens as color
tokens and stripping the real text-color class), CSS custom-property
transitions and letter-spacing broken app-wide (a Tailwind v4 syntax issue
with custom properties), `/catalog` unreachable from the mobile nav,
undefined chart color tokens, a body-composition delta calculation that
discarded valid data when only one metric was missing, a UTC-vs-local-day
date mismatch in the scan window, non-deterministic sort order on scans
sharing a timestamp, a possible negative value in a stacked chart segment,
and a missing avatar image fallback.

### PR #8, navigation-speed fix, 2026-07-27 16:10 ICT

**Process.** The user reported navigation "feels slow" with no other
detail. Rather than optimizing on guesses, the first step was measurement:
confirmed the Vercel function region and the Turso database region were
both Tokyo (no network mismatch), checked bundle size, image handling and
font loading (all already clean), and only then traced the actual
data-fetching waterfall, which turned out to be the real cause: the app
layout blocked all rendering on a profile lookup that most routes didn't
even need, and there were no route-level loading states.

**What shipped.** Removed the blocking profile lookup from the app shell,
cached the catalog query across requests, parallelized independent
queries, added a loading skeleton per route.

**Gate findings:** `regression-scanner` caught that a brand-new user
landing on `/catalog` first, before any page that seeds their profile,
would cache an empty catalog for 5 minutes. `adversarial-reviewer` caught
two more: a markdown-import code path that inserted catalog rows without
invalidating the new cache, and the new cache silently turning date fields
into strings on a cache hit (the cache library JSON-round-trips values).
All three fixed pre-merge.

### PR #9, Login screen redesign, 2026-07-27 16:45 ICT

The one screen the PR #7 redesign had skipped. Design goal: Google
sign-in as the unambiguous primary action, email-OTP demoted to a
disclosure behind it. `ui-designer` produced the spec; a new animated
disclosure primitive and a quieter button variant were built to support it.

**Gate findings:** the collapse toggle was reachable while the user was
mid-way through entering an OTP code, and would silently discard an
already-sent code if tapped; none of the four auth network calls had error
handling, so a network failure left the button stuck with no feedback.
Both fixed pre-merge.

### PR #10, Settings split into sub-routes, 2026-07-27 17:20 ICT

Settings was one page stacking 7 unrelated sections. `ui-designer` was
asked to evaluate, not assume, whether that should become an index plus
child routes or stay one page with better sectioning, and made the call
explicitly (index menu plus 6 routes) with reasoning tied to the actual
screen content (some sections, like the InBody import flow, are
effectively a full-screen task, not a card).

**Gate findings:** the new per-route pages weren't in the server cache's
revalidation list, so a saved value on a sub-page looked reverted if you
navigated back and returned within the cache window; a disclosure
component's open/closed state leaked across an unrelated user action
(discarding one imported scan and starting a new import); a shared toggle
control silently lost its animation in an unrelated token cleanup (the CSS
transition property list didn't include box-shadow, only background-color
and color). All fixed pre-merge.

### PR #11, Catalog search and filter, 2026-07-27 18:05 ICT

**Gate findings:** the text-search normalization function stripped
accented characters using Unicode decomposition, which does not cover
Vietnamese "đ"/"Đ" (they are atomic code points, not a base letter plus a
combining mark), confirmed live by seeding a real catalog item with a
Vietnamese place name and searching for it without the diacritic. Also
found: a long item name would overflow its row instead of truncating (a
missing CSS min-width on a flex child), and a search field's
Escape-to-clear behavior would eat the Escape keypress a parent dialog
needed to close itself.

**Also reverted:** during implementation, a contrast fix to a shared badge
component was applied for accessibility reasons but had the side effect of
breaking a "quiet vs loud" visual pairing used on two unrelated screens.
Caught during self-review before the gate even ran, and reverted as
out-of-scope for this branch rather than fixed forward: the accessibility
issue is real but belongs to its own change, not a side effect of a
Catalog PR.

### PR #12, Workout: last-performance line and bigger inputs, 2026-07-27 19:10 ICT

**Gate findings:** making the reps field required client-side, to stop a
fully-empty submission, accidentally blocked bodyweight and timed sets
that had always been loggable with a null rep count; a new "add exercise"
autocomplete could add a duplicate of an exercise already logged that same
day, since neither the UI nor the underlying action checked for one; a new
"ahead of last session" comparison line could silently disappear when the
best set logged today used a different per-side setting than the
historical comparison set; and a pre-existing bug in how the next set's
index was computed (a row count instead of a max, which can collide after
a middle set is deleted) was newly load-bearing because a new prefill
feature started depending on set ordering being correct. All four fixed
pre-merge.

**Post-merge fix.** The user visually reviewed the merged build and
reported one control read as visually too large. Fixed same-session,
verified, pushed directly (single-file change).

### PR #13, Add-meal in fewer taps, 2026-07-27 20:15 ICT

Closed the redesign backlog. Design goal: reduce the add-meal flow from 3
taps (pick a mode, pick a category, pick an item) to 2 (tap the item,
category pre-guessed from time of day).

**Gate findings:** the time-of-day category inference used the user's
configurable day-cutoff-hour setting directly as a boundary; that setting
is legally configurable up to 12 in the existing validation schema, and at
higher values the inference logic would silently skip breakfast, post-gym
and lunch entirely, always guessing dinner all morning. Also found: the
"add from catalog" action didn't reject an archived catalog item
server-side, the picker UI filtered archived items out of what it showed,
but that filtering only worked against an already-loaded, unrefreshed
list, so a stale reference could still successfully re-add an archived
item. And a failed "undo" action failed silently instead of showing an
error. All three fixed pre-merge.

## What the gate actually caught, in numbers

Across PR #6 through PR #13 (8 pull requests), the adversarial and
regression gate found, and the developer fixed, 30 concrete, reproducible
bugs before any of them reached `main`, ranging from data-loss-adjacent
issues (silent cache staleness, a set-index collision) to correctness bugs
(missing auth checks server-side, broken keyboard interaction, wrong unit
labels) to visual defects (invisible text, broken animations). None of
these were caught by `tsc`, `eslint`, or `next build`, all of which passed
cleanly on every PR before the gate ran; they require reasoning about
behavior, not syntax.

## Honest limitations

- **No automated test suite backs this repo.** The gate's regression
  baseline is the agent reading the base-ref code, not a suite of
  assertions. It is a strong second opinion, not a replacement for tests.
- **The gate does not replace human visual QA.** Every PR in this log was
  also checked live in a browser by the user before merge; the gate found
  functional and logic bugs, not "does this look right" bugs (the one
  post-merge visual fix in PR #12 came from that human check, not the
  gate).
- **PLAUSIBLE findings require judgment, not automatic action.** A few
  findings across these PRs were flagged as risk rather than confirmed bug
  (for example a visual "double footer bar" concern in PR #13, flagged as
  needing a live check rather than fixed blind); the developer decides
  whether to act on them, the gate does not force it.
- **The reviewer agents themselves are not infallible.** The badge-contrast
  revert in PR #11 is an example of the developer, not the gate, catching a
  scope-creep side effect during self-review before the gate agents even
  ran.
