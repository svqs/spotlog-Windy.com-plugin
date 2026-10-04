# Code optimization handoff specification

Status: implemented in 0.18.0; see the [implementation report](../reviews/code-optimization-implementation-2026-10-04.md) for evidence and limitations. Original proposal written 2026-10-04 against 0.17.0,
commit `5557bd4c755a2b34e64817eecf1fda4e2079c790`.
Evidence and source locations: [Code structure review](../reviews/code-structure-2026-10-04.md).

## Objective and constraints

Make the application easier to understand, reuse and extend, while fixing the correctness hazards exposed by
the review. Preserve the current product, recommendation rules, SI values, desktop appearance, phone interactions,
Style Lab, export/import, tombstones/revivals, and Windy plugin entry/lifecycle contract.

Read `AGENTS.md`, `docs/decisions.md`, and the relevant topic docs before implementation. Do not redesign screens,
change learning thresholds, replace Svelte 4, remove historical diary fields beyond existing migrations, or deploy
optional services as part of cleanup. Publishing still requires the owner's explicit request in that conversation.
New stored fields must be cleaned in `normalise()` and remain compatible with old diaries.

Implement small, reviewable changes in the order below. Start with regression tests for confirmed defects. Avoid
a single rewrite of `plugin.svelte`; keep each extracted boundary usable and behaviorally checked.

## Proposed ownership boundaries

Names below are illustrative; use equivalent names if they fit existing conventions better.

| Area | Responsibilities | Must not own |
|---|---|---|
| `plugin.svelte` | Composition, Windy `onopen`, component lifecycle and screen wiring | Merge algorithms, network response parsing, training loops, popup HTML building |
| `lib/diary/commands.ts` | Pure entity edits, deletes, links and undo payloads | DOM, navigation, Windy, network calls |
| `lib/diary/selectors.ts` | Entity indexes and derived diary data | Persistence, markers, global mutable caches |
| `lib/diary/validation.ts` | `unknown` → validated types; compatibility handling | UI strings or forecasts fetched from Windy |
| `lib/storage.ts` | Browser load/save and import/export facade | Account sync scheduling or UI state |
| `lib/controllers/sync.ts` | Account-bound scheduling, pull/merge/push, retries | Screens, Leaflet, globals captured across accounts |
| `lib/controllers/forecasts.ts` | Request identity, UI forecast state, invalidation | Diary mutations except an explicit fallback-selection command |
| `lib/controllers/learning.ts` | Per-spot dependency revisions, examples/skill reuse and training scheduler | Units preferences or markup |
| `lib/adapters/windy.ts` | Typed host operations for account, timeline, point forecasts and geolocation | Domain scoring and diary merges |
| `lib/map/*` | Marker/popup/track lifecycle and display rendering | Direct diary persistence or sync |
| `lib/geo.ts`, `lib/time.ts`, `lib/directions.ts` | Pure geometry, recorded-session time, direction operations | Theme, Svelte stores, Windy imports |
| `ui/screens/*` | Screen presentation and explicit events/props | Direct localStorage/network access |
| `lib/preview/*` | Style Lab-only bridge | Production business rules |

Keep existing public facades while callers migrate. Learning modules should remain cohesive and independent of
theme/design and host services. Do not introduce interfaces for every tiny helper; put test seams at real external
boundaries. Shared styles must be deliberately preserved when Svelte-scoped markup moves into child components.

## Phase 1: correctness safeguards

### W01 — Scope asynchronous work (F01)

Introduce a lifecycle/account generation. Every account-owned task captures that generation, account id, and storage
key. Each completion verifies identity before mutating state, persisting, navigating, setting status, or retrying.
An account switch or destruction invalidates pending work and clears timers; transport cancellation is supplementary.
Track import and forecast capture also capture the specific form/operation they belong to. Add a bounded timeout
to cloud requests and an explicit policy for overlapping pushes so older writes cannot finish after newer ones
without reconciliation.

Acceptance:

- Delay A's pull, switch to B, then resolve A. B's memory/localStorage stays unchanged and B's data is never sent as A.
- Resolve a failed push after destruction. No timer, subsequent request, or state mutation is created.
- Start two track imports or replace the log form while parsing. Only the active operation can attach its result.
- Normal same-account pull/merge/push, retry, upload, and visibility flows still work in the harness.

### W02 — Preserve entity metadata (F03)

Build spot edits from the existing entity plus an explicit set of editable fields. New-spot defaults remain separate.
Use the same pure command pattern for other edits where reconstruction could lose stored metadata.

Acceptance: renaming, moving and adjusting a fallback-model spot preserves `recommendationModel`, `ranges`, id,
and creation time; a new spot receives only intended defaults. Undo and export/reload preserve the same data.

### W03 — Make forecast state identity explicit (F05)

Key derived forecast requests by location and model, with account/generation ownership of UI state. Keep request
metadata alongside results. Clear/recompute affected values when coordinates, model, account or entitlement changes.
Check both coordinates and operation identity for clicked-place completions. Reuse in-flight work and remove pending
markers on failure. Give the low-level caches an eviction policy and available-model data a refresh policy.

Acceptance:

- Move a spot and immediately revisit it: conditions, hours and available models use the new location.
- Resolve old/new model and same-latitude place requests in reverse order: the latest result remains visible.
- Repeated load triggers reuse one pending request for a key; deletion and account switching cannot repopulate stale UI entries.
- A transient request failure can recover, and cache size stays within the documented configured bound during location churn.

### W04 — Validate snapshot and diary boundaries safely (F06)

Replace broad input `any` with guards over `unknown`. Validate finite numbers/nulls, timestamp arrays, model/series
objects, required columns and bounded lengths before supplying typed values to consumers. Document handling of
unaligned columns and unsupported series shapes. Keep usable legacy single-hour snapshots. Invalid forecast content
must not erase its diary entry or its linked session; mark it unusable for learning and render missing values safely.
Validate clock ranges and finite timestamps. Define duplicate/empty-id recovery with an explicit preservation policy.

Acceptance: malformed `series: {ts: []}`, missing columns, non-numeric values, duplicate ids, invalid clocks and old
snapshots load without crashing keyed lists, cards, map or learning. The session/notes/links survive a save/export/reload.
No malformed forecast becomes positive evidence. Add fixtures to old/broken diary scenarios.

### W05 — Correct tree invalidation (F04)

Fingerprint every effective training/validation input, including selected forecast model, features, outcome,
outing kind, day and prior. Use stable ordering and algorithm version. Apply the same identity to positive/negative
cache entries and in-flight training. Bound obsolete entries and discard old-generation results.

Acceptance: changing saved forecast values, session end/coverage, model, kind, timezone/day or prior invalidates
the tree decision even when id/rating/start remain unchanged. A units or notes-only edit does not invalidate it.
Simultaneous calls schedule one job per identity. Deterministic scoring and current eligibility/gates stay unchanged.

## Phase 2: data conflict design (F02)

This is a separate schema/protocol change. Before coding it, add a dedicated migration specification to this index
covering entity revisions, settings conflicts, clock ties, delete/revive precedence, old-client behavior, and server
write concurrency. Document exactly which guarantees hold for legacy full documents. Avoid assigning the newest
document timestamp to every legacy entity and claiming that independent edit history has been recovered.

Proposed direction: optional per-entity revisions normalized for old diaries, plus a server revision/conditional write
with conflict → pull/merge/retry. Keep whole JSON transport initially if adequate. Import explicitly stamps imported
items as replacements/revivals; it must not silently become an ordinary sync operation. Replace the incomplete tab
signature with comparison of the actual merge-relevant state, and make local save failures observable consistently.

Acceptance:

- Concurrent edits to distinct existing entities both survive sync in either direction and after reload.
- Same-entity conflict resolution is deterministic; tie behavior is documented and tested.
- Delete, undo, upload, revive and a stale offline device preserve the chosen precedence.
- A server conflict prevents unconditional overwrite and triggers reconciliation.
- Legacy backups still load/import; new fields are normalized, and migration never silently truncates valid diary data.

Do not mix this change with file moves or recommendation tuning. Do not activate/deploy sync to complete this work.

## Phase 3: reduce recomputation and extract application responsibilities

### W06 — Index and invalidate by meaningful dependency (F07)

Construct snapshot/spot lookups and sessions-by-spot indexes once per relevant revision. Reuse examples and model skill
across learning-model selection, trust display and sport models. Cache today's best result per spot/model/hour revision.
Separate learning inputs from units, fold-out preferences, notes, and navigation. Update markers by id and visual
change instead of tearing down the entire layer. Keep validation/scoring semantics intact.

Measure startup, spot opening, units change and edits on fixed fixtures: existing 30/500/200 diary; concentrated
100/300/600 qualifying outings at one spot with several models; and location/marker churn. Capture call counts,
main-thread tasks, cache entries and time distributions. Record machine/browser and before/after values; the review's
Node timings are illustrative only. Choose and document a browser responsiveness budget from this baseline.

Acceptance: preference-only changes invoke neither example reconstruction nor model-skill evaluation/training;
an outing edit recomputes only its dependent spot/neighbors/models. Concentrated-diary timings improve against the
same baseline without changing model rankings, tags, evidence, windows, gear/tide hints or stored data.

### W07 — Make background training truly schedulable (F07)

Profile the training task itself. If it exceeds the chosen browser budget, move it to a worker supported by Windy's
plugin runtime or implement cooperative batches with cancellation. Preserve deterministic math and safe fallback
to similar sessions; prototype worker loading inside the plugin before depending on it.

Acceptance: a timer/input can progress during large training, stale jobs cannot update new state, jobs are deduplicated,
and outputs agree with synchronous reference training. Any runtime-specific worker limitation is documented.

### W08 — Extract controllers and screens (F08)

After introducing the above seams, extract pure commands/selectors, sync/forecast/learning controllers, map rendering,
then one screen at a time. Keep form drafts separate from persisted entities. Name ambiguous state (`f`, `sf`, `S`)
in newly extracted code and make controller dependencies explicit. Preserve Svelte 4 reactive inputs deliberately;
do not hide reads inside ordinary functions and assume `$:` will track them.

Acceptance: domain commands can be checked without Windy/DOM mocks; screens expose typed events and do not persist
directly. The root handles composition/lifecycle without implementing transport, merge, learning loops or map HTML.
Every moved screen works on desktop and phones, in sandbox and Style Lab, with current navigation/back behavior.

### W09 — Consolidate shared semantics (F09, F11)

Extract pure geometry/directions/time from `wind.ts` and leave colours/labels in presentation modules. Reuse numeric
height/temperature conversions for display/input, retaining intentional rounding differences and Beaufort behavior.
Centralize model/wave mapping while keeping each reader's documented freshness and fallback policies explicit.
Use recorded-timezone time helpers for saved outings; keep new local-clock form inputs explicit.

Use structured GPX errors mapped through copy. Gear persistence uses stable identifiers, with labels/hints in copy
and backward-compatible rendering of existing kinds. Move accessibility labels/tooltips to copy too.
Share a forecast display model between Svelte and Leaflet HTML; keep user-string escaping at HTML boundaries.
Compare the two tide algorithms' units/input/phase semantics before considering consolidation.

Acceptance: SI/display round trips and midnight/DST tests pass; existing rounding, layers and fallback policies are
unchanged. Learning/geometry imports do not reach theme or Windy. Representative visible/accessibility/GPX messages
come from copy and respond in Style Lab. Existing gear names and custom sports remain intact.

## Phase 4: tooling, tests and verified cleanup

### W10 — Make validation trustworthy (F10, F11)

Declare directly used development tools, commit the lockfile, and document supported Node/Python tooling. Use the
locked install in CI and a separate read-only validation workflow; retain publishing as an explicit manual action.
Expose fast checks and full/browser checks with clear server/artifact prerequisites. Add Svelte/type checking and
version-pair consistency to validation. Give optional runtimes their own type/test setup.

Replace blanket Rollup warning suppression with narrowly documented filtering. Make the learning test compilation
fail unexpected diagnostics and prevent stale emitted files from masquerading as fresh tests. Restore the design
loader monkey patch in `finally` or avoid global patching. Separate current/legacy builders and seed generated fixtures.
Clarify the word check's coverage and enforce the intended unused-key policy.

Acceptance: a fresh locked install builds and checks; deliberately broken TS/Svelte code fails the proper command;
learning tests cannot succeed using stale output after a compiler failure. Loader failure restores Node state.
Optional service bad JSON/null bodies and oversized input return controlled errors through runtime-specific tests.
Publishing authorization and secret handling remain unchanged.

### W11 — Remove verified leftovers and update documentation (F12)

Repeat consumer searches across source, scripts, tests, templates and documented public exports. Remove the seven
unused export candidates listed in F12 if no supported consumer exists. Do not remove `trimWaves`, optional services,
Style Lab design hooks, font/license sources, fixture files, tooling declarations or required generated pages.
Keep historical docs dated; explicitly label the old spreadsheet and old learning review as historical where indexed.
Fix stale comments (two-hour windows, trust only informs) and test-count documentation. Update architecture, data,
forecast, learning and testing docs as implemented boundaries or behavior change.

Acceptance: no dangling imports/doc links; all remaining compatibility code names its consumer or migration reason;
required sandbox/Style Lab rebuilds remain reproducible. Review generated changes separately from source changes.

## Completion and handoff requirements

Each work item should report findings addressed, files changed, behavioral differences, validation evidence, and any
remaining limitation. A smaller root file alone is insufficient: demonstrate explicit dependencies, correct cache
invalidation, and less redundant computation. Avoid blanket formatting changes that obscure functional review.

For implementation commits, run all checks required by `AGENTS.md`/`docs/testing.md`: build, lint, words, learning,
Svelte/type checks, e2e, scenarios, and actual phone screenshot inspection. Rebuild sandbox/Style Lab and bump both
version fields for shipped application changes. Document real-Windy checks still needed for host CSS, lifecycle,
experimental APIs and any worker integration. This documentation-only handoff changes no release version and does
not authorize publication.
