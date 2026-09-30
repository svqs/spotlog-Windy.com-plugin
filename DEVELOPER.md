# Spotlog · developer notes (0.5.0)

Spotlog is a client-side Windy plugin (Svelte 4 + TypeScript, built with Windy's official template and
`@windycom/plugin-devtools`). The diary is kept in the browser's `localStorage` on windy.com and — once the sync server is
set up — stored per **Windy user id**, so logging in to Windy on another device shows the same diary. There is no separate
Spotlog login. Forecast data comes from
Windy's own plugin API.

## Architecture

```
src/pluginConfig.ts     plugin manifest (name, rhpane 400 px on desktop, Windy's small bottom panel on phones, map click + context menu, private)
src/plugin.svelte       all screens, navigation (view + history stack), Windy map integration, actions, sync triggers
src/lib/types.ts        data model
src/lib/storage.ts      load / save / export / import / merge (localStorage, JSON)
src/lib/cloud.ts        sync: pull/push of the diary for the logged-in Windy user (sends Windy user id + Windy token)
src/lib/cloudConfig.ts  URL of the sync function (empty = browser only)
supabase/functions/spotlog  the sync server (Supabase Edge Function): checks the Windy login, reads/writes the diary
src/lib/forecast.ts     Windy point forecast → whole-day snapshots, 20-min cache, "next good window"
src/lib/predict.ts      predicted rating (weighted nearest neighbours on wind speed + direction), wind-window suggestion
src/lib/units.ts        unit conversion + formatting, 12/24 h
src/lib/wind.ts         directions, colours, rating colours, gear presets per sport, model ranking, dates
src/lib/gpx.ts          GPX/TCX parser → compact track (≤ 400 points), distance, duration, top speed (10 s window)
src/lib/links.ts        Buy-me-a-coffee link
src/ui/*.svelte         SnapCard, FeltSlider, TimeWheel, SwipeRow, Calendar, Settings
supabase/setup.sql      table + row-level security for account sync
harness/                fake Windy (mock-windy.js, incl. a fake account backend), test page, sandbox builder, e2e test
.github/workflows/      publish-plugin.yml (official Windy workflow)
scripts/publish.sh      same as the workflow, from a terminal
```

## Windy APIs used

| Import | Used for |
|---|---|
| `@windy/fetch` → `getPointForecastData(model, {lat, lon})` | wind, gusts, direction, temperature per model; waves/swell from `ecmwfWaves` / `gfsWaves` |
| `@windy/map` → `map`, `markers`, `centerMap` | Leaflet map: spot labels (`L.divIcon`), route (`L.polyline`), popup (`L.popup`), `fitBounds`, `getCenter` |
| `@windy/singleclick` | map clicks while the plugin is open (`listenToSingleclick: true`) |
| `@windy/store` | `timestamp` (timeline time a snapshot focuses on), `product` (active model) |
| `@windy/reverseName` | place names for clicked points |
| `@windy/rootScope` | `isMobileOrTablet` |
| `@windy/store` → `user`, `subscription` | who is logged in (`{ id, username, email }`) and whether they have Premium (`'premium'`); both are watched live |
| `@windy/broadcast` → `rqstOpen('login' \| 'subscription')` | the Log in / Get Premium buttons on the gate screen |

The close button is **Windy's own** closing ✕ (Windy's `Window` draws it for every rhpane plugin unless `hideClosingX`).
The plugin keeps ~44 px free in the top-right corner for it and no longer draws its own.

## Windy account, Premium and sync

- **Gate:** Spotlog only opens for logged-in Premium users (`store.get('user')`, `store.get('subscription') === 'premium'`).
  Client-side check (good for UX, not a security boundary).
- **One diary per Windy login:** browser key `windy-plugin-spotlog:v1:u<windyUserId>`; logging out/in switches the diary live.
- **Sync = the Windy account, no Spotlog login:** every request sends the Windy user id (`x-windy-user`) and Windy's own login
  token (`x-windy-token`, from `store.get('userToken')`). The server stores one row per Windy user id.
- **The one thing to settle with Windy:** the server must be able to confirm that the token really belongs to that user id —
  otherwise anyone could read or overwrite someone else's diary just by sending their (sequential) user id. Ask the Windy
  plugin team (a) whether plugins may send `userToken` to their own server, and (b) which endpoint/public key verifies it.
  Put that endpoint in the function secret `WINDY_VERIFY_URL`. Until then, only ids listed in `ALLOW_UNVERIFIED_TEST_IDS`
  (you + testers) are accepted — fine for private testing, never for the public release.

## Time zones and midnight

- All times are stored as UTC timestamps; start/end are entered and shown in the device's time zone, and the session saves
  that zone (`tz`, e.g. `Europe/Prague`). Daylight-saving changes are handled by the browser's date maths.
- A session whose end is earlier than its start ends the next day (shown as "Ends the next day"); the forecast uses the
  middle of that window.

## Forecast snapshots

A snapshot stores the **whole day** (05:00–22:00 local, hourly grid; 3-hourly models fill the nearest hour) for the
active model plus ECMWF, GFS, ICON, ICON-EU, AROME (regional models fail quietly outside their area), and waves/swell.

- `ts` + `models` + `waves` = the focus hour (what the card shows, what the model ranking compares against).
- `series` = the whole day, so the focus can move without refetching:
  - standalone "Save forecast" → focus = Windy timeline time; the hour strip on the snapshot page changes it;
  - logging a session → the card reads the day at the middle of start–end; on save the snapshot's focus moves to that time;
  - if the session date changes to another day, a snapshot the log created itself is replaced by one for that day.
- Windy only serves forecasts from today on, so past days can't be captured ("No forecast for that day…").
- Older snapshots (0.2) have no `series` and keep working as single-hour snapshots.

## Stored data

- Browser: `localStorage` of `www.windy.com`, key **`windy-plugin-spotlog:v1:u<windyUserId>`** (one JSON document).
- Server: table `public.spotlog_diary` (`windy_user_id`, `data jsonb`, `updated_at`), one row per Windy user, see `supabase/setup.sql`.
- Inspect: DevTools › Application › Local Storage, Home › Data › Export JSON, or the sandbox **Saved data** button.
- Size: `localStorage` is ~5 MB per origin. A whole-day snapshot is ~4–5 KB, a session ~0.5 KB, a track ~10 KB.
  `save()` catches quota errors and logs them (no UI message yet).
- Every Windy plugin runs on the same origin and could read these keys. Don't store secrets there.
- Units: always SI (m/s, metres, °C, km); converted only for display. Timestamps are ms since epoch.

```ts
{
  version: 1,
  updatedAt,                                   // last local change, used by sync (newer copy wins)
  spots:     [{ id, name, lat, lon, place?, sports: string[], dirs: ('N'|'NE'|…)[], min, max /* m/s */, windUnknown?, created }],
  snapshots: [{ id, spotId: string|null, lat, lon, ts /* focus time */, savedAt, primary /* model */,
                models: [{ model, ts, wind, gust, dir, temp }], waves: {…} | null, note?,
                series?: { ts: number[], models: { [model]: { wind[], gust[], dir[], temp[] } }, waves: { model, waves[], … } | null } }],
  sessions:  [{ id, spotId: string|null, lat?, lon?, snapshotId: string|null, date, rating /* 1–5 */, felt /* m/s|null */,
                gusts, water, gearIds: string[], gear /* free text */, start /* "HH:MM" */, end, notes,
                track?: { points: [lat, lon][], start, end, distanceKm, durationMin, maxSpeed /* m/s */, source } }],
  gear:      [{ id, name, kind, sport? /* Windsurf | Surf | Kite | Wing */ }],
  settings:  { wind: 'ms'|'kt'|'kmh'|'mph'|'bft', height: 'm'|'ft', temp: 'C'|'F', allModels: boolean, layers: string[] }
}
```

## Sync server (switch it on)

Windy's plugin API has no per-user storage for plugins, so the diary lives in a small Supabase project (free tier is plenty).

1. Create a project at <https://supabase.com> (region: EU, e.g. Frankfurt).
2. SQL Editor › paste `supabase/setup.sql` › Run (table `spotlog_diary`, row-level security on, no public access).
3. Deploy the function: `supabase functions deploy spotlog --no-verify-jwt`
   (the function does its own check of the Windy login, so Supabase's own JWT check is off).
4. Secrets: `supabase secrets set ALLOW_UNVERIFIED_TEST_IDS=<your Windy user id>,<tester id>` for private testing, and
   `WINDY_VERIFY_URL=…` once Windy tells you how to verify their token.
   (Your Windy user id: open Spotlog, then in the browser console `W.store.get('user').id`, or ask Windy.)
5. Put the function URL (`https://<project>.supabase.co/functions/v1/spotlog`) into `src/lib/cloudConfig.ts`, build, publish.

How it syncs: every local save pushes the whole document (debounced 1.2 s). On open, both copies are merged by id (newer
document wins for the same item, deletions are kept as tombstones for 90 days).

**Later: shared spot tips.** Because every diary is stored per user, the server can compute anonymous per-spot summaries
(e.g. "most users rate this spot great with W–NW 6–10 m/s") and serve them to everyone. That needs an opt-in in the plugin
and a privacy note; the data model already has what's needed (spots with coordinates, sessions with ratings and forecasts).

## Security, privacy and risks

**What protects users today**
- No `{@html}`/`innerHTML` with user text: Svelte escapes everything; map labels and popups go through `escapeHtml`.
- Everything read from storage, an import file or the account is validated (`normalise()` in `storage.ts`): types,
  coordinates, lengths, list sizes. Import files are capped at 25 MB, GPS files at 40 MB / 2 000 stored points.
- No secrets in the plugin. The Windy publish key lives only in GitHub Secrets. The database is only reachable through the
  sync function (service role on the server); the table has row-level security with no public policies, plus a 10 MB check.
- No Spotlog passwords or logins at all: identity comes from the Windy login (see "Windy account, Premium and sync").
- External links open with `rel="noopener noreferrer"`. No trackers, no ads, no third-party fonts.

**Known limits (by design of Windy plugins)**
- Plugins run inside windy.com with full page access and share its `localStorage`. Another *untrusted* plugin the user
  installs could read Spotlog's diary in the browser. Tell users to only install plugins they trust.
- The Windy login token is sent to our sync function, which only uses it to ask Windy who the user is and never stores it.
  Needs Windy's OK before a public release.
- Browser-only mode: clearing site data deletes the diary. Two open tabs are merged (storage event), not overwritten.
- Sync is per document: for the same item edited on two devices, the newer copy wins. Deletions are kept as tombstones
  for 90 days so they don't come back.
- GPS tracks can reveal where someone starts (home, car park). They're only shown to the user themselves; if sharing ever
  comes, trim the first/last few hundred metres.
- GDPR: privacy note (what's stored, where: Supabase region EU, keyed by Windy user id). "Delete all Spotlog data" in
  the plugin empties the diary everywhere; the function also supports `DELETE` for removing the row completely.

## Network requests

- Windy's own forecast and geocoding endpoints (through the plugin API).
- The sync function (`<project>.supabase.co/functions/v1/spotlog`), only when it's configured and the user is logged in to Windy.
- No font or analytics requests: Instrument Sans + Doto are embedded (`src/lib/fonts.ts`, generated by
  `scripts/build-fonts.py` from `assets/fonts`, SIL OFL). The fonts are subsets: Instrument Sans variable 400–600
  (Latin + Latin Extended-A) and Doto (A–Z, 0–9, a few signs), ~36 KB instead of ~110 KB.

## Bundle size

`plugin.min.js` is ~245 KB (~96 KB gzipped): ~48 KB embedded fonts, ~25 KB CSS, the rest compiled Svelte.
Further ideas if needed: drop Latin Extended-A (accents then fall back to the system font), use Windy's own UI font
instead of Instrument Sans (−35 KB), or split rarely used screens (calendar, GPX reader) into lazily loaded code.

## Testing

```bash
npm install
npm run build                 # dist/plugin.js (+ .min.js, plugin.json)
python3 -m http.server 8765   # from the project root
python3 harness/e2e.py /tmp   # 29 checks, screenshots to /tmp (pip install playwright)
python3 harness/assemble.py   # rebuilds the single-file sandbox harness/sandbox.html
```

The fake Windy (`harness/mock-windy.js`) implements the API surface above with synthetic forecasts (different per model,
AROME unavailable outside France), a stand-in for Windy's closing ✕, and a fake sync server that checks a mock Windy token.

## Publishing (test link)

1. Windy Plugins API key: <https://api.windy.com/keys> (no domain restriction; project identification = the GitHub repo URL).
2. GitHub › Settings › Secrets › Actions › `WINDY_API_KEY`, then Actions › publish-plugin › Run workflow
   (or `WINDY_API_KEY=… npm run publish:windy` locally).
3. Copy the install URL from the "Publish Plugin" step: `https://windy-plugins.com/<user id>/windy-plugin-spotlog/<version>/plugin.min.js`
4. Testers: <https://www.windy.com/plugins> › Load plugin directly from URL › Install untrusted plugin.
5. Bump `version` in `src/pluginConfig.ts` **and** `package.json` for every publish (the URL contains the version).

Docs: <https://docs.windy-plugins.com/getting-started/publishing-plugin.html>

## Review checklist before a public release

- [ ] Real Windy (developer mode + published URL): map clicks, context menu, `centerMap`, route drawing, popup look, Windy's ✕ placement
- [ ] Windy's global CSS doesn't leak into the panel (generic class names like `.card`, `.btn`, `.chip`, `.row` are Svelte-scoped but could still pick up unset properties). Prefixing with `sl-` would remove the risk
- [ ] Mobile browser test (fullscreen UI, long-press › Spotlog, touch drag on the ruler and swipe rows)
- [ ] Sync: Windy's OK + token verification (`WINDY_VERIFY_URL`), CSP check for `*.supabase.co`, privacy note in the plugin
- [ ] `poi-label` click events (clicking Windy's own place names) — not wired yet
- [ ] Storage quota message in the UI
- [ ] Replace the placeholder Buy-me-a-coffee link in `src/lib/links.ts`
