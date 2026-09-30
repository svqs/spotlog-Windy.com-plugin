# Spotlog · developer notes (0.2)

Short version: **there is no backend.** Spotlog is a client-side Windy plugin (Svelte 4 + TypeScript, built with
Windy's official template and `@windycom/plugin-devtools`). All user data is stored in the browser's `localStorage`
on windy.com. Forecast data comes from Windy's own plugin API. Nothing is sent to any server run by us.

## Architecture

```
src/pluginConfig.ts     plugin manifest (name, rhpane 400 px, fullscreen on mobile, map click + context menu, private)
src/plugin.svelte       all screens, navigation (view + history stack), Windy map integration, actions
src/lib/types.ts        data model
src/lib/storage.ts      load / save / export / import (localStorage, JSON)
src/lib/forecast.ts     Windy point forecast → snapshot values, 20-min cache, "next good window"
src/lib/predict.ts      predicted rating (weighted nearest neighbours on wind speed + direction), wind-window suggestion
src/lib/units.ts        unit conversion + formatting, 12/24 h
src/lib/wind.ts         directions, colours, model ranking (reality check), dates
src/lib/gpx.ts          GPX/TCX parser → compact track (≤ 400 points), distance, duration, top speed (10 s window)
src/ui/*.svelte         SnapCard, FeltSlider, TimeWheel, SwipeRow, Calendar, Settings
harness/                fake Windy (mock-windy.js), test page, sandbox builder, Playwright e2e test, sample GPX
.github/workflows/      publish-plugin.yml (official Windy workflow)
scripts/publish.sh      same as the workflow, from a terminal
```

## Windy APIs used

| Import | Used for |
|---|---|
| `@windy/fetch` → `getPointForecastData(model, {lat, lon})` | wind, gusts, direction, temperature per model; waves/swell from `ecmwfWaves` / `gfsWaves` |
| `@windy/map` → `map`, `markers`, `centerMap` | Leaflet map: spot labels (`L.divIcon`), route (`L.polyline`), popup (`L.popup`), `fitBounds`, `getCenter` |
| `@windy/singleclick` | map clicks while the plugin is open (`listenToSingleclick: true`) |
| `@windy/store` | `timestamp` (timeline time a snapshot is for), `product` (active model) |
| `@windy/reverseName` | place names for clicked points |
| `@windy/broadcast` | `rqstClose` |
| `@windy/rootScope` | `isMobileOrTablet` |

Models tried for every snapshot: the active one + ECMWF, GFS, ICON, ICON-EU, AROME (regional models fail quietly outside their area).

## Stored data

- Where: `localStorage` of `www.windy.com`, key **`windy-plugin-spotlog:v1`**, one JSON document.
- Inspect: DevTools › Application › Local Storage › `https://www.windy.com` › that key. Or in the plugin: Home › Data › Export JSON. In the sandbox: **Saved data** button.
- Lifetime: per browser and per device. Clearing site data for windy.com deletes it. Private windows lose it on close.
- Size: `localStorage` is ~5 MB per origin. A session without a track is ~0.5 KB, a snapshot ~1 KB, a track (≤ 400 points) ~10 KB → roughly 300–400 sessions with tracks before it gets tight. `save()` catches quota errors and logs them (no UI message yet).
- Shared origin: every Windy plugin runs on the same origin and could read this key. Don't store secrets here.
- Units: always SI (m/s, metres, °C, km); converted only for display. Timestamps are ms since epoch.

```ts
{
  version: 1,
  spots:     [{ id, name, lat, lon, place?, sports: string[], dirs: ('N'|'NE'|…)[], min, max /* m/s */, windUnknown?, created }],
  snapshots: [{ id, spotId: string|null, lat, lon, ts /* forecast time */, savedAt, primary /* model */,
                models: [{ model, ts, wind, gust, dir, temp }], waves: { model, waves, wavesPeriod, wavesPower, wavesDir,
                swell1, swell1Period, swell1Dir } | null, note? }],
  sessions:  [{ id, spotId: string|null, lat?, lon?, snapshotId: string|null, date, rating /* 1–5 */, felt /* m/s|null */,
                gusts, water, gearIds: string[], gear /* free text */, start /* "HH:MM" */, end, notes,
                track?: { points: [lat, lon][], start, end, distanceKm, durationMin, maxSpeed /* m/s */, source } }],
  gear:      [{ id, name, kind }],
  settings:  { wind: 'ms'|'kt'|'kmh'|'mph'|'bft', height: 'm'|'ft', temp: 'C'|'F', allModels: boolean, layers: string[] }
}
```

`normalise()` in `storage.ts` fills missing arrays/settings, so older exports still load. Import merges by `id`.
GPS files are parsed in the browser; only the downsampled points are kept, the file itself is not stored.

## Network requests

- Windy's own forecast and geocoding endpoints (through the plugin API).
- **Google Fonts** (`fonts.googleapis.com`) for Instrument Sans + Doto, injected once on mount. This sends the user's IP to Google; before a public release, consider bundling the fonts or using Windy's font.
- Nothing else. No analytics, no own server.

## Testing

```bash
npm install
npm run build                 # dist/plugin.js (+ .min.js, plugin.json)
python3 -m http.server 8765   # from the project root
python3 harness/e2e.py /tmp   # 18 checks, writes screenshots to /tmp (pip install playwright)
python3 harness/assemble.py   # rebuilds the single-file sandbox harness/sandbox.html
```

The fake Windy (`harness/mock-windy.js`) implements just the API surface above with synthetic forecasts
(slightly different per model, AROME unavailable outside France) so flows can be tested without windy.com.

## Publishing (test link)

1. Windy Plugins API key: <https://api.windy.com/keys>
2. `WINDY_API_KEY=… npm run publish:windy`, or GitHub › Settings › Secrets › `WINDY_API_KEY`, then Actions › publish-plugin › Run.
3. Copy the install URL from the output: `https://windy-plugins.com/<user id>/windy-plugin-spotlog/<version>/plugin.min.js`
4. Testers: <https://www.windy.com/plugins> › Load plugin directly from URL › Install untrusted plugin.
5. Bump `version` in `src/pluginConfig.ts` **and** `package.json` for every publish (the URL contains the version).

Docs: <https://docs.windy-plugins.com/getting-started/publishing-plugin.html>

## Review checklist before a public release

- [ ] Test in real Windy (developer mode and the published URL): map clicks, context menu, `centerMap`, route drawing, popup look inside Windy's Leaflet
- [ ] Check Windy's global CSS doesn't leak into the panel. Class names like `.card`, `.btn`, `.chip`, `.row`, `.tabs`, `.list` are scoped by Svelte but still generic (the sandbox already hit this once with `.bar`). Prefixing with `sl-` would remove the risk
- [ ] Mobile browser test (fullscreen UI, long-press › Spotlog, touch drag on the ruler and swipe rows)
- [ ] `poi-label` click events (clicking Windy's own place names) — not wired yet
- [ ] Storage quota message in the UI; maybe cap the number of stored track points
- [ ] Fonts: bundle or drop Google Fonts
- [ ] Decide on sync (below)

## If you want a backend later

Today each browser has its own diary (export/import JSON to move it). Cross-device sync needs a small backend with auth,
e.g. Supabase / Firebase / Cloudflare Workers + D1, storing the same JSON shapes per user. Windy's plugin API doesn't offer
per-user storage. The code is ready for it: `load()` / `save()` in `src/lib/storage.ts` are the only two places that touch storage.
Windy plugins must be served from `windy-plugins.com`, but the code can call your own API (Windy's docs describe private
plugins as a way to show your own data without listing the plugin publicly).
