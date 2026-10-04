# Code optimization implementation — 2026-10-04

Implemented locally in **0.18.0**, against the [optimization specification](../specifications/code-optimization-spec.md)
and original 0.17.0 commit `5557bd4c755a2b34e64817eecf1fda4e2079c790`. No plugin or optional service was published.
The product, scoring thresholds, stored SI units and desktop design are preserved.

Follow-up: 0.18.1 removes the unused Supabase server, Deno configuration/lock and server-only tests after the owner's decision not to use it. The server evidence below describes 0.18.0; production sync remains disabled, and local diary behavior is unchanged.

## Changes and acceptance evidence

| Work | Implementation and behavioral result | Validation |
|---|---|---|
| W01 | `controllers/lifetime.ts` and `sync.ts` invalidate account/component generations, serialize conditional writes and cancel retry ownership. Cloud requests time out after 15 seconds. Root form/location/upload/track/capture operations check their generation before accepting results. | Unit checks cover account switches, destruction, retries and write conflicts. Browser tests delay account A's pull while switching to B, and finish track imports in reverse order. |
| W02 | `diary/commands.ts` edits explicit fields over the existing spot. Draft screens cannot replace metadata accidentally. | Renaming and moving preserves fallback model, ranges, id and creation time in unit and browser checks. |
| W03 | `controllers/requests.ts` provides bounded TTL caches and pending-request reuse; `controllers/forecasts.ts` keys requests by both coordinates, model and relevant entitlement/options. Empty/failed requests can retry. Low-level forecasts/tides have bounded caches. Root clears affected state on edits and incoming merges. | Deduplication, failure recovery, bounds and location identity are unit checked. Browser reverse-order same-latitude responses retain the latest longitude and forecast. |
| W04 | `diary/validation.ts` guards unknown input, finite bounded timestamps, real clocks and aligned snapshot columns. Invalid forecasts retain notes/session links with `forecastInvalid`; duplicate/empty ids are recovered deterministically. | Broken and legacy diaries, duplicate ids and malformed series are covered by unit/browser scenarios, including save/reload preservation. |
| Phase 2 | Independent entity/settings revisions, immutable save baselines, deterministic ties, explicit import revival, complete tab signatures and server compare-and-swap. `storage.ts` remains the browser facade. | Distinct-entity edits, ties, deletes/revival, legacy loading and simulated server conflicts pass. The [migration specification](../specifications/diary-conflict-migration-spec.md) describes old-client limitations and deployment order. |
| W05 | Tree identity includes effective examples, selected model, outcome, day, kind, features, provenance, prior and algorithm version. Pending/positive/negative caches use the same identity and discard obsolete results. | Exact-input invalidation, notes/units stability and deterministic scoring checks pass. |
| W06 | Indexed diary selectors and `controllers/learning.ts` reuse per-spot examples, skill, sport models and hourly recommendations. Settings saves avoid canonical scans of all entities. Marker reconciliation updates changed descriptors instead of rebuilding every marker. Timezone formatters are reused. | Unit checks isolate dependent spots; browser measurements show zero example/skill calls on unit changes. Large-diary and marker flows pass. |
| W07 | Tree fitting uses cooperative batches and a serialized queue with cancellation and pending-job deduplication. | A timer progresses during training; cancelled work cannot publish; async results equal the synchronous reference. The 8 ms deadline is checked between trees, so an individual tree can exceed it. |
| W08 | Gear, About and SpotForm are typed presentation components. Commands, selectors, sync/forecast/learning controllers, map HTML, track/marker lifecycle and the preview bridge have separate owners. Shared screen styles are explicitly scoped to `[data-spotlog]`. | Full desktop/phone navigation passes; moved screens and live copy overrides pass in Style Lab. Root reduced from 3,214 to 2,709 lines, but still owns navigation, drafts and host map construction. Further screen extraction remains possible. |
| W09 | Pure geo/direction/time helpers, numeric unit conversions, structured GPX errors, typed forecast columns, shared live/stored mappings and shared Svelte/map display values. Accessibility and stable gear labels/hints use copy. | SI round trips, recorded-zone midnight/DST, GPX, units, map cards and learning checks pass. Tide algorithms remain separate because categorical time-third phases and continuous height interpolation have different meanings; see forecast docs. |
| W10 | Committed lockfile/direct tooling, Node >=20, locked Python Playwright, strict fresh test compilation, safe design-loader restoration, version/type checks and separate read-only CI. Optional runtimes have their own checks. | Fresh `npm ci --offline`, lint, words, versions, Svelte/TS, core, learning, optional services and production build pass. Deno checks the actual function and pinned SDK; worker HTTP/KV tests cover null/invalid JSON and UTF-8 byte limits. |
| W11 | Removed seven verified unused exports and the unused Rollup cleanup dependency. Retained supported compatibility and fixtures; labeled historical reviews. Topic docs, indexes and harness builders now describe current behavior. | Missing/unused/duplicate copy keys all zero (449 phrases). Rebuilt sandbox and Style Lab pages; consumer and document-link checks accompany the final review. |

## Browser performance

Same machine (Apple M1 Pro, macOS 26.7.1 arm64), Chromium 153.0.8010.12, Node 24.19.0; three runs per
version/fixture. Baseline uses the original commit's compiled bundle; fixtures contain 100/300/600 distinct-day,
qualifying outings at one spot with three models. Values below are medians in milliseconds. Unit interaction includes
opening settings, changing to knots and observing persistence; task observations cover the unit change itself.
Raw runs: [performance evidence](artifacts/code-optimization-performance-2026-10-04.json).

| Outings | Startup before → after | Unit interaction before → after | Largest unit-change long task before → after |
|---|---:|---:|---:|
| 100 | 1,072 → 991 | 241 → 83 | 174 → none observed |
| 300 | 1,445 → 1,171 | 853 → 138 | 731 → none observed |
| 600 | 1,693 → 1,708 | 2,299 → 204 | 2,136 → none observed |

Before, every unit change called model skill twice and rebuilt examples seven times. After, both counts are zero
in all nine runs, with no observed task >=50 ms during those changes. Choose reference budgets on this machine of
**250 ms for unit interaction**, **no unit-change task >=50 ms**, and **2 seconds startup at 600 outings**.
These are fixture-specific regression targets, not promises for all devices. Initial model-skill evaluation remains
costly on concentrated diaries; 600-outing startup is essentially unchanged. The ordinary 30-spot/500-session/
200-snapshot scenario also passes, alongside data, unit, timezone and 320–430 pixel phone checks.

## Validation and remaining limits

The final end-to-end run passes all **50 steps with zero browser errors**. Six focused browser regressions include
Style Lab. Learning retains its **16 check groups**, with additional cache/scheduling assertions. Scenario phone
screenshots are visually inspected, not merely checked for overflow. Test time and GPX dates are fixed for e2e so
Today/session-hour expectations do not depend on when a developer runs the suite.

Optional Supabase SQL/function changes have **not been deployed**. Protocol tests and Deno type checking pass;
the SQL compare-and-swap still needs integration testing against an isolated PostgreSQL/Supabase instance before
deployment. Old clients cannot reconstruct historical per-entity edits, and the new server rejects writes without an
expected revision. Follow the migration spec before activating sync.

Real Windy still needs owner verification of host CSS, lifecycle/account events, Premium tides and experimental
hourly/daylight/predictability/regional-model endpoints. The local harness cannot establish their production behavior.
No worker-loading assumption was introduced; cooperative training uses the existing plugin runtime.

Learning caches rely on the documented immutable-array update contract used by application commands. Keep that
contract when adding mutations. The root remains large; moving additional screens can now use the established
typed event/style boundary without coupling them to persistence or network scheduling.
