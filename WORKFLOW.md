# How this project is built

This document records the working process behind fit-coach, so that the
process is auditable and not just the output: what was decided, by whom,
on what evidence, and what was caught before code reached `main`.

It is deliberately split in two, because the way this project is built
changed partway through:

- **Part 1 (PR #6 to #19)** is a process I designed and ran on my own: a
  two-agent adversarial review gate in front of every merge.
- **Part 2 (PR #20 onward)** follows a directive I was given on
  2026-07-29 by Gabriel Aguilera, an engineer who mentors me, in a call
  whose transcript I worked from directly. The instruction was to stop
  building the first thing that works and start evaluating alternatives
  with measurements. Part 1's gate stayed in force underneath it.

The distinction matters for reading the rest: Part 1 is my own judgment
about verification, Part 2 is a method I was handed and then applied.

To be explicit about the tooling, since the rest of this document assumes
it: this project is built with Claude Code. The reviewers, designer and
research agents described below are subagents I defined and run there,
and implementation is AI-assisted throughout. What stays mine is the
direction: which alternatives get evaluated, which findings get fixed
versus deferred, what is accepted visually, and what ships.

All facts below come from the project vault log and this repo's commit
history. Nothing here is reconstructed from memory.

---

# Part 1: the review gate (PR #6 to #19)

## The problem this process addresses

Before 2026-07-27, PRs were reviewed by a single pass: write code, run
`tsc`/`lint`/`build`, optionally run a `personal-standards-reviewer` agent
for code-standard conformance, then merge on my own read of the
diff. That catches type errors and style drift. It does not catch behavior:
whether the new code actually survives bad input, and whether it actually
leaves old flows working. Both classes of bug had shipped before under
that process.

## The roles

Four distinct agents are used, each with a single job and no overlap:

| Agent | Job | Output |
|---|---|---|
| `ui-designer` | Owns UI/UX decisions for a screen or flow. Reads the current code and design tokens, proposes an implementable spec (layout, hierarchy, states, tokens, motion, accessibility). Never writes code. | A written spec, which I review before implementation starts. |
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

I decided on and built this the same session, immediately before PR #6:
two standalone Sonnet-model agents (`adversarial-reviewer`,
`regression-scanner`) created as reusable subagents, gate policy written
into my engineering standards. Deliberately kept independent
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

**Design process.** My starting brief was blunt: "quiero cambiar la ui del
proyecto, no me gusta nada" (I want to change the UI, I don't like any of
it). I created a `ui-designer` agent for this specifically, spec-only,
never code, so design judgment stays a distinct step from implementation.

I rejected the first design pass outright after seeing it running: it
changed the dark background, which I wanted kept, and introduced
green/teal as a primary color. That work was reverted before
ever being pushed (a hard reset on an unpushed commit, no shared state was
touched). I re-briefed the agent with hard constraints: do not touch the
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

**Process.** All I had was that navigation "feels slow", with no other
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

**Post-merge fix.** Reviewing the merged build in a browser, I found one
control read as visually too large. Fixed same-session, verified, pushed
directly (single-file change).

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

### PR #14 to #19, features and polish, 2026-07-29 to 2026-07-30

The same gate ran on each: an exercise catalog with animated
demonstrations, the coach's long-term vector memory, component editing for
composable catalog items, and three rounds of visual polish.

Two things from this stretch are worth recording because they were
process failures, not gate findings:

- **A design direction was built and rejected live.** A two-column
  dashboard layout was implemented across every route, and I rejected it
  the moment I saw it running. It was reverted the same session; only the
  incidental polish from that branch shipped. The gate cannot catch this
  class of problem, which is why the visual QA step stays separate from
  it.
- **Two branches independently generated a colliding `0006` migration**,
  and both had already been applied to a shared database. The fix was to
  rebase the second branch, delete its migration artifacts, regenerate as
  `0007`, and verify the hash was already recorded as applied before
  merging. The lesson kept for later: with a shared database, migration
  numbering is a cross-branch resource, not a per-branch one.

## What the gate caught in Part 1, in numbers

Across PR #6 through PR #13 (8 pull requests), the adversarial and
regression gate found 30 concrete, reproducible bugs, all fixed before
any of them reached `main`, ranging from data-loss-adjacent
issues (silent cache staleness, a set-index collision) to correctness bugs
(missing auth checks server-side, broken keyboard interaction, wrong unit
labels) to visual defects (invisible text, broken animations). None of
these were caught by `tsc`, `eslint`, or `next build`, all of which passed
cleanly on every PR before the gate ran; they require reasoning about
behavior, not syntax.

---

# Part 2: architecture-first (PR #20 onward)

## The directive, 2026-07-29

The gate in Part 1 verifies that what I built works. It says nothing
about whether I built the right thing, because by the time a diff exists
the design decision is already made and the gate is reviewing its
consequences.

The directive I was given was aimed at exactly that gap, and had three
parts: for any component that can be built more than one way, evaluate the
real alternatives instead of defaulting to the first one; prove each one
with an isolated experiment before it touches the real codebase; and stop
treating the AI layer as a prompt, because an assistant that never chooses
which query to run is a chatbot with memory, not an agent.

Applying the definition honestly to my own code was the uncomfortable
part: at that point the coach assembled its context in deterministic
TypeScript before a single model call and had zero tool use. By the
standard I had just been handed, it was not an agent.

## How the method changes the work

Three things became standing practice:

**Alternatives are enumerated before one is picked, and the losers are
recorded with the reason.** A rejected option with a stated reason is
reusable knowledge; a silently discarded one has to be rediscovered.

**Each component gets a throwaway experiment first, in a separate `labs`
repository, before any of it lands here.** The labs are kept rather than
deleted: a lab whose conclusion shipped is more valuable afterwards,
because it carries the measurement that justified the decision.

**Claims are measured, including the ones from the person giving the
directive.** The clearest example: the directive came with the assertion
that retrieval-augmented memory was obsolete, citing an unnamed paper. I
went looking for that source. It does not exist as described, and the
2026 evidence points the other way. That finding is recorded as a
refutation rather than quietly dropped, and it changed nothing about the
value of the rest of the directive.

## What the labs actually measured

Four experiments, each answering one question that could not be settled by
reading documentation:

| Lab | Question | What it found |
|---|---|---|
| `p0-provider-layer` | Does one SDK really abstract different provider APIs, with a per-request key? | Yes, across two genuinely different wire formats. **But capability varies per model, not per provider**: two models on the same provider and endpoint disagreed on whether they accept a JSON schema. That turned a capability registry from a theory into a requirement. |
| `p1-tool-loop` | Does the SDK's native tool loop work on free models for a multi-tool agent? | 20 of 20 measurable cells passed. The operational ceiling was the free tier: a tool loop spends 2 to 3 requests per question, and the daily cap died mid-run, so the app has to surface quota errors honestly rather than degrade in silence. |
| `p1b-tool-approval` | Does human-in-the-loop approval before a write work on those models? | Yes on two models, and **not at all on a third, which never called the write tool under the prompt that made the others call it reliably.** Declaring tool support and choosing to use a write tool are different properties, and no catalog publishes the second one. |
| `p2-memory-supersession` | Can a correction be made to invalidate the belief it replaces? | Both mechanisms tested failed, which is covered below. |

The third row is the one that most changed how I write these features: a
capability flag is a claim about the API surface, not a prediction of
behavior, so a feature that depends on behavior has to name the models it
was measured on.

## The rule that came out of this phase

Several bugs in this phase shared one shape: a rule stated in a prompt,
obeyed inconsistently, with no code path enforcing it. The model picked a
portion size the user had not chosen. The model announced it had logged a
meal it never logged. Each time, the fix that held was not better prompt
wording but moving the rule into code: the portion became an app-rendered
picker whose choice is applied server-side at the tool's own execution,
and the false claim became an app-side check against whether the tool
actually ran.

The general form: **if correctness depends on a model following an
instruction, it is not enforced.** Prompts express intent; only code
enforces it.

## Where that rule was learned the hard way

The memory work is the clearest single example, because the first
implementation passed its lab and still failed.

The problem: a vector store models similarity, not time. When a user
corrected a stored preference, both the old belief and the correction
stayed retrievable, ranked only by similarity, so the coach could keep
citing something the user had already overturned.

The first design keyed the fix on the fact category: a fact classified as
a `correction` would deactivate the belief nearest to it. It passed the
lab cleanly. It failed on its first real input, and the reason is worth
stating precisely: **the lab supplied the category, while the real app has
a model infer it.** The extraction prompt defines a preference as "what
the user likes, dislikes, wants" and a correction as "telling the coach it
was wrong or to stop doing something". The sentence "I do not like salmon,
stop suggesting it" satisfies both definitions exactly. The model chose
one, reasonably, and the trigger never fired.

That is not a misclassification to fix with wording. The categories
overlap by construction, and the design had hung a destructive action on
which side of the overlap a model happened to land.

The second design asks the model a question it can actually answer: not
*is this a correction*, but *what is this fact about*. Each fact carries a
normalized subject key, and a new fact deactivates every active fact
sharing it, by exact string match, with no similarity threshold anywhere
in the decision. Measured against the real database on a topic with no
prior history, it superseded correctly on a pair where neither fact was
classified as a correction, which is precisely the case the first design
could not handle.

A separate measurement explains why the obvious alternative was never
built: letting similarity alone decide what supersedes what. Real
same-topic contradictions measured between 0.1152 and 0.2056 cosine
distance, and a genuinely unrelated pair measured 0.1754, inside that
range. No threshold separates the two classes, so no amount of tuning
would have worked.

The invariant that came out of it, at most one active fact per user and
subject, is now enforced twice: in application code, and by a partial
unique index that makes the invalid state unrepresentable regardless of
what the code does.

## The gate still applies, and caught this

The two review agents ran on the final memory design and found two real
bugs before anything was committed: the deduplication path could erase a
fact's subject silently, and could leave two active facts sharing one
subject, which is a direct violation of the invariant the feature exists
to guarantee. Both were fixed before the first commit, and the unique
index was added as a backstop for the second.

Worth noting for honesty: the gate had already run once earlier on the
first design, and that run was discarded rather than counted, because the
design it reviewed no longer existed. A review of code you then replace is
not evidence about the code you ship.

### PR #29 and the memory-consolidation branch, P3 background maintenance, 2026-08-06

Everything in this app up to this point only ran because a user sent a
message: the per-turn memory refresh and fact extraction both fire inside
a request. P3 is the piece that runs whether or not anyone is chatting,
which the architecture doc calls the line between a production system
and a chatbot with extra steps.

**The trigger question got its own lab before any app code was written**,
same method as everything above: `p3-background-jobs` deployed Vercel
Cron and Vercel Workflow DevKit to a throwaway Vercel project and
confirmed both fire correctly (Vercel's own `vercel crons run` triggers a
registered cron on demand, closing what looked like a 24-hour wait on the
Hobby plan). Workflow DevKit works, but its durability guarantee (step
retry, resuming across deploys) is not needed for a job this size; plain
Cron shipped, Workflow DevKit is the documented upgrade path if that
changes. Inngest was deliberately not tested: its only edge over the
other two, sub-daily precision or event triggers, is not something this
job needs, and standing up a third account to re-confirm a settled answer
was not worth it.

PR #29 shipped the first job on that trigger: `coach_facts` untouched for
30+ days gets deactivated, the same mechanism supersession already uses.
`category = 'correction'` is exempt by a product decision made mid-build:
the extraction prompt defines a correction as the thing that matters
most, so letting it silently expire because the user never repeated it
would be the app forgetting the one category it promises never to forget.

**The gate caught a real bug on the memory-consolidation branch that
follows the same shape as the quinoa bug from the supersession work**:
the background re-grounding of `coach_memory` (built from a user's
active facts plus their recent logged data, so memory does not go stale
for a user who logs meals without chatting) was written to construct the
new summary from facts and data alone, with no reference to the memory
already there. Both review agents flagged it independently: a nightly
cron would silently replace weeks of conversational nuance, an open
question, a coaching decision, with a summary derived only from
structured sources that were never meant to be complete on their own.
The fix reframes the job as a merge, not a rewrite: the existing memory
is passed into the prompt and the instruction is to keep everything that
still holds, revise only what the current facts or data contradict. The
transferable lesson is the same one supersession already taught from a
different angle: a background job that touches a single source of truth
has to be told what already exists, not just what changed.

---

# Honest limitations

- **No automated test suite backs this repo.** The gate's regression
  baseline is the agent reading the base-ref code, not a suite of
  assertions. It is a strong second opinion, not a replacement for tests,
  and it is the largest single gap in everything described above.
- **The gate does not replace human visual QA.** I checked every PR in
  this log live in a browser before merge; the gate found functional and
  logic bugs, not "does this look right" bugs (the one post-merge visual
  fix in PR #12 came from that human check, not the gate).
- **PLAUSIBLE findings require judgment, not automatic action.** A few
  findings across these PRs were flagged as risk rather than confirmed bug
  (for example a visual "double footer bar" concern in PR #13, flagged as
  needing a live check rather than fixed blind); I decide whether to act
  on them, the gate does not force it.
- **The reviewer agents themselves are not infallible.** The badge-contrast
  revert in PR #11 was caught during self-review before the gate agents
  even ran, not by the gate.
- **A lab proves what it was given, not what production supplies.** The
  memory lab passed a design that then failed in the app, because the lab
  handed the code an input the real system has a model produce. The
  correction is to make a lab's inputs come from the same place the app's
  will, and I did not do that the first time.
- **Sample sizes in the labs are small.** They are large enough to
  disprove a claim (one measured counterexample kills a threshold) and too
  small to establish a rate. Where a lab's verdict is provisional, it says
  so in that lab's own README.
