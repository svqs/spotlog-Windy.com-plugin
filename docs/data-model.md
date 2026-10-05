# Data model and storage (src/lib/types.ts, src/lib/storage.ts)

## Where the diary lives

- **Browser:** one JSON document in `localStorage` on windy.com, under the key `windy-plugin-spotlog:v1:u<windyUserId>`
  (one diary per Windy login). A diary from before accounts were linked (key without `:u…`) is taken over the first time.
- **Account sync:** disabled. No diary sync server is included after the Supabase removal in 0.18.1.
  The backend-neutral client in `src/lib/cloud.ts` and its test mock remain, with `cloudConfig.ts`'s URL empty.
  "Download a copy" / "Upload a copy" on How it works provide backup and device transfer.
- **Storage is SI:** m/s, m, °C, mm, km, ms timestamps (UTC). Values are converted only for display (`units.ts`).

## Shape

```ts
SpotlogData {
  version: 1,
  spots:     Spot[]       // id, name, lat, lon, place?, sports[], dirs[] (forecast wind FROM), min/max (forecast m/s), windUnknown?, created,
                          // recommendationModel? (fallback when ECMWF has no forecast here; unset = ECMWF),
                          // ranges?: { [sport]: { [condition]: { lo?, hi?, dirs? } } }  (your own ranges, from Adjust)
  snapshots: Snapshot[]   // id, spotId|null, lat, lon, ts (focus), savedAt, primary, models: ModelValue[], waves, note?,
                          // forecastInvalid?: true // bad imported series kept as an entry, excluded from learning
                          // series?: { ts[], models: {[m]: {wind[], gust[], dir[], temp[], rain?[]}}, waves|null, tide?: {highs[], lows[], highsM?[], lowsM?[]} }
  sessions:  Session[]    // id, spotId|null, lat?, lon?, snapshotId|null, date (= start instant), rating 1–5,
                          // checked? (Not worth it, didn't go), sport?,
                          // gearIds[], gear (free text), start/end "HH:MM", notes, track?, tz
  gear:      Gear[]       // id, name, kind, sport?
  settings:  Settings     // units, models/layers to save, map toggles, spotView, phoneSheet, welcomed, worksOpen,
                          // spotOrder (ids, the home screen's order from dragging; new spots follow)
  updatedAt?: number      // last local change; fallback only for legacy entities without revisions
  revisions?: {id: ms}     // last entity edit, preserved independently of unrelated changes
  settingsAt?: number     // last settings edit (whole-object conflict resolution)
  deleted?:  {id: ms}     // tombstones, kept 90 days
  revived?:  {id: ms}     // brought back by upload after a delete: newer than the delete wins
}
```

**Sports** are strings:
- The usual ones are `Surf`, `Windsurf`, `Kite` and `Wing` (`wind.ts → SPORTS`).
- Anything else is a sport the user typed under "Other…" (max 20 characters), kept by name and learned with the
  `Other` conditions.
- `Other` (and `SUP`) from older diaries stay as custom names.
- A session logged with a sport its spot didn't have adds that sport to the spot.

## Validation: `normalise()`

Everything read from `localStorage`, an uploaded file or the account goes through `normalise()`:
- types are checked;
- coordinates must be in range;
- strings are capped;
- lists are capped (spots 2 000, snapshots 5 000, sessions 10 000, gear 500, track points 2 000);
- unknown settings fall back to their defaults;
- tombstones older than 90 days are dropped.

Snapshot models, waves and series are validated over `unknown` in `lib/diary/validation.ts` (re-exported by
`storage.ts`). A series needs a finite ascending time axis (1–1,000 points), a model map (up to 32 models), and
aligned wind/direction arrays. Optional columns are aligned to the axis and missing/nonfinite values become null.
Malformed series are removed from the typed object and `forecastInvalid: true` persists through export/reload:
notes, identity and linked sessions remain, but the entry cannot teach. Valid legacy single-hour saves still teach
with the existing limited-evidence rule. Timestamps must fit JavaScript's Date range; clocks must be real HH:MM.

Duplicate ids are retained with deterministic `~recovered-N` suffixes, and empty ids get `recovered-kind-index`.
References continue to target the first original id. Existing entity/track/string limits remain unchanged.

A broken document loads as an empty diary (the welcome shows) instead of crashing.

**Adding a stored field:**
1. Add it to `types.ts`.
2. Add it to the matching `clean*` function in `lib/diary/validation.ts`, with a safe default for old diaries.
3. Add a scenario to `harness/scenarios.py` ("old diary") if old data needs special handling.

## Merging

- **`mergeData(a, b)`** is used for account sync and two open tabs:
  - items are matched by id; the newer entity revision wins (legacy fallback: document `updatedAt`);
  - equal stamps choose lexicographically larger canonical JSON; settings use their independent `settingsAt`;
  - deletes win unless an explicit revival is at least as new; both maps retain the existing 90-day horizon.
- **`importJson`** (Upload a copy) merges a downloaded copy into what's there. Nothing is replaced wholesale, and
  everything in the file counts as revived now.
- **Two tabs:** the storage listener compares actual contents and all merge metadata, then merges and refreshes forecasts.
- **Local commands:** an immutable serialized baseline stamps only edited entities. Settings-only commands reuse the
  unchanged entity baseline, first seeding legacy revisions with the *old* document timestamp.
- **Server:** revision/conditional writes prevent full-document overwrites. A 409 triggers pull/merge/retry; old
  clients without `expectedRevision` receive 428. Writes are serialized and scoped to the account generation.

[Diary conflict migration](specifications/diary-conflict-migration-spec.md) documents ties, legacy limits, rollout
and guarantees. Clock ordering does not recover lost legacy history or merge two simultaneous edits within one entity.

## Limits and costs

- `localStorage` holds about 5 MB per origin. Sizes:
  - a whole-day snapshot: ~4–6 KB (more with many regional models);
  - a session: ~0.5 KB;
  - a track: ~10 KB.
- `save()` returns false when the browser refuses; `persist()` then shows a one-time "storage is full" toast.
- Every plugin on windy.com shares this origin, so never store secrets in the diary.

## Legacy fields, kept so old diaries still load

| Field | Since | Now |
|---|---|---|
| `session.tide`, `tideMove`, `spot.startOwn` | 0.12–0.14 | **Dropped in 0.16.2.** Tides come from the saved forecast. |
| `session.felt`, `gusts`, `water` | ≤ 0.15 | **Dropped in 0.16.1** (nobody used the plugin yet): `normalise()` leaves them out, so they disappear at the next save. The sessions themselves stay. |
| snapshots without `series` | ≤ 0.2 | Single-hour snapshots; used only within 1.5 h of a session. |
