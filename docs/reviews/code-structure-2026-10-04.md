# Code structure and maintainability review — 2026-10-04

Reviewed commit: `5557bd4c755a2b34e64817eecf1fda4e2079c790` (0.17.0), with a clean working tree at the start.
Implementation handoff: [Code optimization specification](../specifications/code-optimization-spec.md).

## Assessment

The top-level structure is appropriate for a small browser plugin. `src/`, `harness/`, `scripts/`, `docs/`,
`supabase/`, and `tide-worker/` have distinct purposes. The learning engine already separates examples, features,
scoring, ranges, trees, and windows. Tide parsing is separated from network access. Small UI components, shared
types, SI storage, centralized copy/theme, and behavioral tests are useful foundations to preserve.

The main design weakness is the application boundary. `src/plugin.svelte` is 3,214 lines: approximately 812 lines
of markup, 2,027 lines of script, and 373 lines of styles. It owns navigation, forms, diary mutations, sync,
forecast caches, learning orchestration, Leaflet rendering, phone interactions, and the Style Lab bridge.
Section comments make it navigable, but changes require understanding too much shared mutable state.
The architecture document explicitly describes this as intentional; extraction should be incremental.

Readability is uneven: domain comments explain intent well, while dense one-line functions, chained ternaries,
single-letter state names, type assertions, and implicit reactive dependencies make implementation harder to follow.
Reuse is good inside learning and UI primitives, weaker across forecast display, time handling, and mutation flows.
Scalability is limited by broad recomputation, quadratic validation of model skill, synchronous tree training,
full-document storage/sync, and complete marker rebuilds. There is no reason to replace Svelte 4 or introduce a
general framework to address these problems.

Priorities below: **P1** correctness/data safety before structural work; **P2** maintainability/performance;
**P3** cleanup. “Reproduced” means a local module probe; other findings are source-traced unless stated otherwise.

## Findings

### F01 — P1: asynchronous work is not scoped to account or component lifetime

Locations: `src/plugin.svelte:1298` (`onWindyUser`), `:1550` (`schedulePush`), `:1569` (`syncNow`),
`:1615` (`onUpload`), `:2450` (`onTrackFile`), `:2810` (`onDestroy`); `src/lib/cloud.ts:27`.

`syncNow()` captures authentication before awaiting `pull()`, but then merges into the current global `data` and
calls `save()` using storage's current account key. If account A's pull resolves after switching to B, A's diary
can be merged into B's local diary and pushed back to A. Destruction clears timers but does not invalidate
already-running sync; a failed in-flight push can schedule another retry afterwards. Upload/track/forecast work
also lacks a consistent account/form generation guard. Clearing a timer is insufficient for requests already running.

Sync is currently optional (`cloudConfig.ts` defaults to off), so the cross-account sync risk applies when enabled
or in its mock. The lifecycle problem also affects browser-only asynchronous flows.

Improvement: capture account id, storage key, lifecycle generation, and relevant form/request identity; discard stale
results and stop retries. Add cancellation/timeouts at the transport boundary where supported.

### F02 — P1: whole-document conflict resolution loses independent edits

Locations: `src/lib/storage.ts:162` (`mergeData`), `src/plugin.svelte:1595` (`sig`),
`supabase/functions/spotlog/index.ts:55` (PUT).

Reproduced: A edits gear g1 at document timestamp 2; B edits g2 at timestamp 3 but still has the original g1.
Merging returns the original g1 and edited g2. All duplicate ids use the newer document's copy, even when that
particular item was unchanged. This is documented behavior, but conflicts with a broad “never lose user data” promise.
The server's unconditional whole-document upsert can also overwrite another device's intervening push.
The tab write-back signature considers ids, tombstone/revival keys, and settings, but excludes item contents and
stamp values; it is not a complete test of whether the merged document was persisted.

Improvement: explicitly design per-item revisions and server concurrency checks. Keep import's intentional
“uploaded item wins and is revived” semantics separate from ordinary sync. This requires a migration specification,
not just a generic merge-helper extraction.

### F03 — P1: editing a spot drops its persisted fallback model

Location: `src/plugin.svelte:2112` (`saveSpotForm`); field contract: `src/lib/types.ts:19`.

The edit path constructs a new `Spot` and only restores `old.ranges`. It omits `old.recommendationModel`.
Renaming or changing the window of a spot with a fallback therefore resets its base learning model to ECMWF,
potentially triggering another selection and changing which saved forecasts teach.

Improvement: apply validated editable fields to the existing entity rather than reconstructing it. Test preservation
of the fallback and ranges through ordinary edits, including future non-editable fields.

### F04 — P1: tree cache keys omit inputs that change training

Location: `src/lib/predict.ts:60–97` (`treeKey`, cache, scheduler).

The key includes version, spot/sport, prior, and session id/rating/start. It omits features, session kind, day/timezone,
end/coverage, and forecast model/provenance. Reproduced with the existing 120-outing fixture: after training, adding
2 m/s to every saved wind value changed the derived examples (first wind 4 → 6), yet `learnSpot()` returned the
same cached tree object. Cached negative training decisions are subject to the same omission.

Improvement: fingerprint all training and validation inputs, or use explicit dependency revisions. Deduplicate
pending training, bound the cache, and reject results from obsolete generations.

### F05 — P1: forecast state has incomplete cache identities and stale-result guards

Locations: `src/plugin.svelte:1348` (`reloadFor`), `:1920` (`onMapPick`), `:2009` (`loadModels`),
`:2112` (`saveSpotForm`), `:2503` (`loadNow`), `:2526` (`loadAllNow`), `:2541` (`loadOutlook`);
`src/lib/forecast.ts:38`, `:179`.

Component caches are largely keyed by spot id. Editing coordinates clears outlook but retains conditions and
available models; `loadNow()` can return old coordinates' cached data. Model changes start new requests without
invalidating old completions, which can replace `dayBySpot`/outlook. Account changes retain caches and `nowAt`.
Map reverse-name and condition completions compare latitude only, so two points on the same latitude can race.
`loadNow()` does not reuse a pending result when its cache contains `'loading'`.

The low-level forecast cache does deduplicate requests, but its TTL expires entries only when the same key is
requested again; it does not evict abandoned locations. Available-model entries have no refresh lifecycle.

Improvement: define keys from coordinates/model and authorization where relevant; add request generations, explicit
invalidation, pending-request reuse, and bounded eviction. Separate public forecast reuse from account-owned UI state.

### F06 — P1: validation does not deliver the safety promised to typed readers

Locations: `src/lib/storage.ts:87` (`cleanSnap`), `:102` (`cleanSession`), `:122` (`normalise`);
`src/lib/learn/examples.ts:97`, `src/lib/forecast.ts:250`, `src/ui/SnapCard.svelte:28`.

Snapshot values/series intentionally bypass deep validation, as documented. However, consumers are not consistently
defensive: a snapshot with `series: {ts: []}` survives normalization and makes `exampleOf()` throw while reading
`series.models.ecmwf` (reproduced). Other readers index arrays directly and call numeric methods such as `toFixed`.
Validation also accepts syntactically shaped but invalid clocks (`99:99`), empty ids, and duplicate ids; duplicate
ids can reach keyed Svelte lists. Broad `any` and casts conceal the boundary mismatch.

Improvement: use `unknown` at input boundaries and validate a bounded snapshot shape before typed use. Preserve
the diary entry when forecast data is unusable; skip learning and show missing values. Validate clocks and ids,
and specify conservative duplicate-id recovery rather than silently throwing away sessions.

### F07 — P2: unrelated changes rerun expensive learning and map work

Locations: `src/plugin.svelte:1201`, `:1343`, `:1367`, `:1372`, `:1381`, `:1731`;
`src/lib/learn/skill.ts:22`, `src/lib/learn/examples.ts:97`, `src/lib/predict.ts:69`, `:83`.

`learnModels` and `modelMap` depend on the entire `data` object. A units change or fold-out preference can rerun
model evaluation for every spot. The open spot separately calls `modelSkill()` again. Examples scan sessions and
find snapshots in arrays; nearby learning repeats construction. Model skill predicts each outing from all outings
on other days, with filtering and sorting, giving at least quadratic work per model.

Local one-model `modelSkill()` probes on 100/300/600 synthetic outings took approximately **32/135/442 ms**.
These are illustrative Node timings, not a browser benchmark or a service-level guarantee. Existing large-diary
scenarios distribute 500 sessions over 30 spots, so they do not represent hundreds of training outings at one spot.

Marker refresh removes and recreates every marker and repeatedly filters sessions per spot. Tree training yields
once before a full synchronous `trainTrees()` call; the computation itself can block the main thread.

Improvement: index diary entities, cache examples/skill per affected spot and model, distinguish settings from
learning revisions, update changed markers, and profile concentrated diaries before choosing workers/chunking.

### F08 — P2: the root component has too many responsibilities

Locations: `src/plugin.svelte:1`, `:813`, `:1176`, `:1518`, `:1648`, `:1961`, `:2706`.

Screens, domain commands, persistence, host adapters, caches, and the preview bridge all reach shared mutable state.
Functions appear reusable but often close over `data`, forms, navigation, and Windy's globals. `_dep` parameters and
reactive arrow functions deliberately expose hidden dependencies to Svelte 4; moving them without understanding
that mechanism can silently break updates. Mutation plus `data = data` forces broad invalidation.

Improvement: keep the root as composition/lifecycle entry point. Extract pure diary operations and selectors first,
then controllers and screens with explicit inputs/events. Preserve phone behavior, scoped styles, and exported
`onopen`; splitting markup alone does not solve the state coupling.

### F09 — P2: shared concepts have multiple implementations and mixed layers

Locations: `src/lib/wind.ts:1–118`; imports in `src/lib/predict.ts:14`, `src/lib/gpx.ts:1`;
`src/plugin.svelte:1317`, `:1428`, `:1830`, `:2571`; `src/lib/learn/examples.ts:58`;
`src/lib/forecast.ts:91`, `:138`, `:273`; `src/lib/units.ts:19–79`; `src/lib/learn/tide.ts:7`;
`src/lib/tides/tideCore.ts:270`.

`wind.ts` combines geometry, directions, date formatting, UI colours, model names, gear metadata and English copy.
Learning/GPX import it for geometry/directions and thereby reach theme/design. Temperature conversion and forecast
column mapping recur across readers; input unit conversion is duplicated in the root. Session midpoint and duration
use local-clock/fixed-day arithmetic while learning's `outingTimes()` uses the recorded timezone and handles DST.
Forecast tiles also have parallel markup in SnapCard, home, and popup HTML.

Two `tideAt` implementations serve different shapes/semantics (raw tide snapshot versus saved extremes). Their
similar names warrant clearer contracts, not automatic replacement with one function.

Improvement: separate pure domain helpers from presentation and host access; unify proven-equivalent conversions,
forecast mappings, and time operations. Share a forecast display model where HTML and Svelte cannot share rendering.
Expand dense branching code where names and intermediate values improve reviewability.

### F10 — P2: tooling is not reproducible and diagnostics are weakened

Locations: `.gitignore:12`, `package.json:7–26`, `rollup.config.js:47`,
`.github/workflows/publish-plugin.yml:17`, `scripts/test-predict.mjs:11–15`,
`scripts/load-design-lib.mjs:18–29`, `tsconfig.json:43–47`.

The lockfile is ignored; build/lint/compiler packages are imported or executed directly but only plugin-devtools
is declared. Builds rely on its transitive dependency installation and the publish workflow uses `npm install`.
Rollup suppresses every warning. Learning tests suppress every compiler failure and can load emitted/previously
cached JS. `npm run check` omits Svelte checking and browser suites; lint/types exclude the two optional runtimes,
which have no checked-in package/test configuration of their own. The design loader globally patches Node's
`Module._load` without `finally`, leaving it patched if loading fails.

Improvement: pin the supported toolchain with direct development dependencies and a lockfile, expose intentional
validation commands, filter only understood warnings, fail unexpected compiler errors, and restore loader state.
Add separate validation entry points for Deno/Worker code rather than mixing their types into the browser build.

### F11 — P2: copy policy and test fixtures have gaps

Locations: `src/plugin.svelte:6`, `:23`, `:99`, `:407`, `:1309`; `src/ui/Calendar.svelte:3`;
`src/lib/wind.ts:44–96`; `src/lib/gpx.ts:25–37`; `scripts/check-words.py:7–21`;
`harness/scenarios.py:11–35`; `docs/testing.md`.

Copy checking passes but only verifies recognized keys and duplicates; it cannot detect hard-coded labels,
tooltips, gear names/hints or surfaced GPX error messages. It lists unused phrases without failing on them.
Those strings violate the repository's central-copy rule despite a green check.
Modern scenario builders still populate removed felt/gust/water/manual-tide fields, mixing legacy coverage into
normal fixtures. Learning checks now report 16 groups while testing/learning docs say 15. The previous dated
learning review describes pre-v2 behavior and must be read as historical evidence.

Improvement: move presentation strings to copy using stable stored gear identifiers and structured error codes;
test representative accessible text and dynamic keys. Separate modern/legacy fixtures, seed randomness for
reproducibility, and add targeted regression coverage for F01–F06 and concentrated-data responsiveness.

### F12 — P3: leftovers exist, but large/generated files are mostly intentional

Repository-wide source/script searches found no callers of these exports: `forecast.captureModels`,
`wind.dirMatches`, `wind.round0`, `wind.round1`, `wind.RATINGS`, `wind.GEAR_KINDS`, and `units.guessWindUnit`.
`GEAR_KINDS` says “kept for older data,” but storage validates gear kind as a string and does not use that list.
These are removal candidates after a final consumer search, including templates and tests.

Retain `trimWaves` (used by the place screen), `design.ts` (used by Style Lab), the optional server/worker,
`DEVELOPER.md`/`CLAUDE.md` redirects, font sources/licenses, and GPX fixtures. The three generated harness pages,
including roughly 0.90 MB sandbox/preview files, are intentionally committed deliverables. The 513 KB Leaflet
declaration is tooling input; do not delete it merely for size. `docs/rating-logic.xlsx` is already documented as an
outdated 0.13 reference; label/archive it rather than treating it as current learning logic. Historical specifications
and reviews should stay dated and preserve their original findings.

## Verification and limits

- `npm run lint`: passed.
- `python3 scripts/check-words.py`: passed; 378 phrases, no missing/unused/duplicate keys.
- `node scripts/test-predict.mjs`: passed; 16 groups.
- Temporary Node probes reproduced F02, F04, F06 and sampled F07 timings. Probes used synthetic data and compiled
  modules, without opening or modifying a real diary.
- Local `svelte-check` was unavailable, so the type/Svelte check was not run. Build, browser e2e/scenarios,
  screenshot QA, real Windy, and deployed services were not exercised for this documentation-only review.
- Findings come from tracked-file inventory, relevant topic docs, and source tracing across application, UI,
  learning, storage, forecast/tide adapters, scripts, harness, and optional services. This is a maintainability
  review, not a complete security audit, empirical memory profile, or proof that every unused export was found.

No application code, version, generated deliverable, commit, push, or publication was changed by this review.
