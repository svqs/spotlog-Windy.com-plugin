# Architecture

## Runtime

- spotlog is a **Windy plugin**. It's an ES module that Windy loads into windy.com, either from a URL on
  windy-plugins.com or from developer mode.
- It runs **inside the windy.com page** and has the page's full access. Windy's modules are imported as `@windy/*`
  (they are externals and are not bundled).
- `src/pluginConfig.ts` is the manifest:
  - `rhpane`, 400 px wide on desktop; `small` (Windy's bottom pane) on phones;
  - listens to map clicks and adds itself to the context menu;
  - `routerPath: /spotlog`;
  - `private: true`.
- Build: Rollup + Svelte 4 + TypeScript (swc) + LESS. The entry is `src/plugin.svelte`, and the outputs are
  `dist/plugin.js` and `dist/plugin.min.js` (the published one).
- Fonts (Instrument Sans, Doto) are embedded as subsets in `src/lib/fonts.ts`, so spotlog makes no external font
  requests.

## Module map

| File | Role | Depends on |
|---|---|---|
| `src/plugin.svelte` | All screens, navigation, map drawing, actions, sync triggers, derived state | everything below |
| `src/ui/SnapCard.svelte` | The white forecast card (tiles, model switch, badge) | units, wind |
| `src/ui/FeltSlider.svelte` | The magnetic "it felt like" ruler (drag, keys, haptics) | haptic |
| `src/ui/TimeWheel.svelte` | Start/end time wheels | units, haptic, copy |
| `src/ui/SwipeRow.svelte` | Swipe-to-delete rows | copy |
| `src/ui/Calendar.svelte` | Sessions calendar | copy |
| `src/ui/Settings.svelte` | Units + what a forecast saves | units, forecast, wind, copy |
| `src/lib/predict.ts` | The learning and the rating guess | wind, types |
| `src/lib/forecast.ts` | Windy forecast access, caching, snapshots, tides, predictability | `@windy/fetch`, `@windy/http` |
| `src/lib/wind.ts` | Directions, sports, gear presets, wind colours, **model ranking** (`modelScores`, `trustedModel`, `forecastBias`), date formats | theme |
| `src/lib/units.ts` | Unit conversion (wind incl. Beaufort, height, temp), formatting, 12/24 h | – |
| `src/lib/storage.ts` | localStorage key per Windy user, `normalise`, `mergeData`, import/export, tombstones | types |
| `src/lib/cloud.ts` + `cloudConfig.ts` | Optional account sync (pull/push/remove) | types |
| `src/lib/copy.ts` | Every phrase, grouped by screen; `w`, `fill`, `rich` (brand + bold) | design |
| `src/lib/theme.ts` | Every colour, shape and map mark; turns them into CSS variables (`--sl-*`) | design |
| `src/lib/design.ts` | A Style Lab design applied on top of the defaults (normally empty) | – |
| `src/lib/gpx.ts` | GPX/TCX → compact track (~400 points) | wind (distance) |
| `src/lib/haptic.ts` | Tiny vibration on supported phones | – |

## `plugin.svelte` anatomy

The file is long on purpose: everything that shares state lives in one component. Use the section comments to find
your way around:

- **Markup:** `grep -n "<!-- =====" src/plugin.svelte`
- **Script:** `grep -n "/\* ----------" src/plugin.svelte`

**Markup, top to bottom**

| Block | When it shows |
|---|---|
| Phone bar | Phones (`barMode`): a compact bar in Windy's pane. Pages open in a panel that rises over the map. |
| Gate | The user isn't logged in to Windy, or isn't Premium (`bcast.emit('rqstOpen', 'login' / 'subscription')`). |
| Welcome | Once, for someone new (`settings.welcomed`). |
| Header | Wordmark, back, the units pill (`Settings`). |
| `view === 'home'` | Actions (Save forecast / Add spot / Log session), stats, tabs: Spots (tiles or list), Sessions (list/calendar), Gear, How it works (data download/upload, delete everything). |
| `'pick'` | "Where?": tap the map, the map centre, your current location, one of your spots, no place, or (when logging) your last saved forecast. |
| `'place'` | A clicked map point: the three actions there. |
| `'spotForm'` | New/edit spot: name, sports (+ "Other…" for your own), wind window or "I don't know yet". |
| `'spot'` | The spot page (see below). |
| `'snap'` | A saved or previewed forecast (SnapCard), link to spot, note, save/replace. |
| `'log'` | Log/edit a session: spot + sport, date/time, rating or "Not worth it, didn't go", felt ruler, gusts, water, gear, GPX, notes. |

**The spot page, in order:**
1. SnapCard (conditions now, model switch) and the actions.
2. The save nudge.
3. Wind window card. This card also holds the learned window suggestion, today's tide times, the best-tide line and
   the stats.
4. **When to go:** today and the next 5 days, matching days only, with Windy's predictability % under each of the next days.
5. **What works here for you:**
   - folded: one line per sport;
   - open: per sport, a table with Your range · Matters · Today, plus Adjust (your own ranges).
   Gear hints sit at the bottom of the open card.
6. **Which forecast to trust here:** one bar per model; the closest model is full length (yellow once it has 3+ sessions).
7. Saved forecasts, then sessions.

**Script: the state that matters**

| State | What it holds |
|---|---|
| `data: SpotlogData` | The diary. Every change goes through `persist()`: tombstones/revived stamps, `updatedAt`, the local `save()`, then a debounced account push. |
| `view`, `hist`, `spot`, `snap`, `f` (log form), `sf` (spot form) | Navigation: `go(view)` pushes onto `hist`, and back pops it. |
| `trustMap` | spot id → the model to use (the most accurate one with 3+ sessions, else ECMWF). From `wind.ts → trustedModel`. |
| `modelMap` | spot id → `SportModel[]`: what spotlog learned (samples from the spot + nearby spots at half weight, the bias, the start rating). Recomputed when the diary changes. |
| `nowBySpot` | Conditions now per spot (key `id`, or `id:model` for other models), 20-minute lifetime. |
| `dayBySpot` | Today's hours per spot (for the best stretch of today). |
| `outlookBySpot` | 6 days of hours, Windy's predictability per day, and today's tides (spot page only). |
| `guessOf(s)`, `bestOf(s)` | The rating now and the best stretch of today (tiles, map, card). |
| `spotLearned`, `spotParts`, `spotDays`, `spotBest`, `spotTide`, `spotGear` | The spot page's derived data. |

## Data flow

```
Save forecast ──► forecast.captureDay(lat, lon, focusTs, primary, models, layers)
                    ├─ every covering model (ecmwf, gfs, icon, mblue + regional by bounding box), hourly, 25 points
                    ├─ waves (ecmwfWaves → gfsWaves), rain, temperature
                    └─ tide highs/lows (experimental)
                  → Snapshot { ts, models, waves, series }

Log session ────► Session { date, start/end, rating, felt, sport, … , snapshotId }
                  └─ the snapshot's focus moves to the middle of the session (series re-read, no refetch)

Learning ───────► samplesFor(spot, sessions, snapshots, trustedModel) → Sample[] (forecast at the session time + rating)
                  learnSpot(spot, samples, {bias}) → SportModel[] (ranges + importance per condition)
                  guess(models, conditionsNow) → Guess {rating, sport, parts}
                  bestToday / nextDays(models, hours) → DayBest (tags, When to go, map pins)

Trust ──────────► modelScores(spot, sessions, snapshots): |felt − forecast| per model → ranking, best model per spot
```

## Windy APIs used

| Import | Used for |
|---|---|
| `@windy/fetch` `getPointForecastData(model, {lat, lon, step: 1}, {summary, celestial})` | Hourly point forecasts per model, the daily predictability summary, sunrise/sunset |
| `@windy/fetch` `getTideForecastUrl` + `@windy/http` `get` | Tide (undocumented for plugins; experimental) |
| `@windy/map` `map`, `markers`, `centerMap` | Leaflet: spot labels and dots, session glow, the route, the popup card, fitBounds |
| `@windy/singleclick` | Map clicks while the plugin is open |
| `@windy/store` | `timestamp` (timeline time), `product`, `user`, `subscription`, `userToken` (sync) |
| `@windy/broadcast` | Open Windy's login / Premium / menu |
| `@windy/reverseName` | Place names for clicked points |
| `@windy/rootScope` | `isMobileOrTablet` |
| `@windy/geolocation` | "My location" (falls back to the browser's `navigator.geolocation`) |

## Map

- **Spot labels:** `L.divIcon` labels. A spot lights up when its guess is at least `theme.lightFrom` (good). Below zoom
  `compactBelow`, labels become small dots (Style Lab tokens).
- **Sessions:** a glow where you've been out; more sessions make it brighter (`sessionMarkStyle`).
- **Show on map:** a popup card on the spot with the forecast tiles, the rating tag and the best stretch of today. It
  has no reason list: "why" lives in What works here.
- **Phones:** the card has Save forecast / Log session / Details buttons, and ‹ › to step through spots.
