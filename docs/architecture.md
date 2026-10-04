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
| `src/ui/TimeWheel.svelte` | Start/end time wheels | units, haptic, copy |
| `src/ui/SwipeRow.svelte` | Swipe-to-delete rows | copy |
| `src/ui/Calendar.svelte` | Sessions calendar | copy |
| `src/ui/Settings.svelte` | Units + what a forecast saves | units, forecast, wind, copy |
| `src/lib/predict.ts` | Public recommendation facade and tree-job identity | learn/*, geo, directions, types |
| `src/lib/learn/*.ts` | Recommendation engine (see docs/learning.md), independent of presentation/host modules | geo, directions, time, types |
| `src/lib/forecast.ts` | Coverage/freshness policy, snapshots, tides and bounded public caches | adapters/windy, forecast-values, tides |
| `src/lib/wind.ts` | Sports/gear presentation, colours, date formatting; compatibility exports | theme, geo, directions |
| `src/lib/units.ts` | Unit conversion (wind incl. Beaufort, height, temp), formatting, 12/24 h | – |
| `src/lib/storage.ts` | Browser storage and import/export facade; re-exports normalise/merge | diary/*, types |
| `src/lib/cloud.ts` + `cloudConfig.ts` | Backend-neutral sync transport (disabled; no server included) | types |
| `src/lib/copy.ts` | Every phrase, grouped by screen; `w`, `fill`, `rich` (brand + bold) | design |
| `src/lib/theme.ts` | Every colour, shape and map mark; turns them into CSS variables (`--sl-*`) | design |
| `src/lib/design.ts` | A Style Lab design applied on top of the defaults (normally empty) | – |
| `src/lib/gpx.ts` | GPX/TCX → compact track (~400 points) | wind (distance) |
| `src/lib/haptic.ts` | Tiny vibration on supported phones | – |

## `plugin.svelte` anatomy

The root composes Windy's lifecycle, navigation, form drafts and explicit UI acceptance of asynchronous results.
The large spot/log/snapshot screens remain here; extraction is incremental rather than a rewrite. Gear, About and
SpotForm live in `ui/screens/` with typed events and no persistence or network access.

New boundaries in 0.18:

| Module | Ownership |
|---|---|
| `lib/diary/{commands,selectors,validation,revisions,merge}.ts` | Pure edits, indexes, unknown-input validation, serialized baselines and entity conflict rules |
| `lib/controllers/{sync,forecasts,learning,lifetime,requests}.ts` | Injected transport, serialized writes, bounded requests, per-spot examples/skill reuse and account/operation ownership |
| `lib/adapters/windy.ts` | Typed/validated point-forecast host boundary |
| `lib/map/{markers,pins,popup,tracks,html}.ts` | Marker reconciliation, escaped display HTML and separate track lifecycle; Leaflet creation is injected by the root |
| `lib/{geo,time,directions,forecast-values}.ts` | Pure domain calculations and weather column mapping |
| `lib/forecast-display.ts` | Shared formatted values for SnapCard and Leaflet; escaping occurs only at the HTML boundary |
| `lib/preview/bridge.ts` | Style Lab-only installation and teardown; navigation callbacks are composed in the root |

Learning inputs use immutable entity arrays: commands replace arrays/items. Settings-only commands explicitly avoid
re-fingerprinting all forecast entities. Svelte only assigns a new learning-state object when dependencies change;
returning the same object and assigning it again would still dirty downstream Svelte 4 declarations.

`ui/application.less` preserves the original application selectors. The build tags each local selector compound with
`[data-spotlog]`, and only markup formerly owned by the root carries that attribute. Existing reusable components
keep their own Svelte-scoped styles. Explicit `:global` Leaflet/phone selectors remain global. Verify generated CSS
and phone screenshots whenever moving another screen.

Use the section comments to find your way around:

- **Markup:** `grep -n "<!-- =====" src/plugin.svelte`
- **Script:** `grep -n "/\* ----------" src/plugin.svelte`

**Markup, top to bottom**

| Block | When it shows |
|---|---|
| Phone bar | Phones (`barMode`): a compact bar in Windy's pane. Pages open in a panel that rises over the map. |
| Gate | The user isn't logged in to Windy (`bcast.emit('rqstOpen', 'login')`). A Premium gate is there but off (`NEEDS_PREMIUM = false`). |
| Welcome | Once, for someone new (`settings.welcomed`). |
| Header | Wordmark, back, the units pill (`Settings`). |
| `view === 'home'` | Actions (Save forecast / Add spot / Log session), stats, tabs: Spots (tiles or list), Sessions (list/calendar), Gear, How it works (data download/upload, delete everything). |
| `'pick'` | "Where?": tap the map, the map centre, your current location, one of your spots, no place, or (when logging) your last saved forecast. |
| `'place'` | A clicked map point: the three actions there. |
| `'spotForm'` | New/edit spot: name, sports (+ "Other…" for your own), wind window or "I don't know yet". |
| `'spot'` | The spot page (see below). |
| `'snap'` | A saved or previewed forecast (SnapCard), link to spot, note, save/replace. |
| `'log'` | Log/edit a session: spot + sport, date/time (a start is needed), rating or "Not worth it, didn't go", gear, GPX, notes. |

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
6. **Which forecast to trust here:** models ranked by how well they foretold your sessions (`learn/skill.ts`).
7. Saved forecasts, then sessions.

**Script: the state that matters**

| State | What it holds |
|---|---|
| `data: SpotlogData` | The diary. Every change goes through `persist()`: tombstones/revived stamps, `updatedAt`, the local `save()`, then a debounced account push. |
| `view`, `hist`, `spot`, `snap`, `f` (log form), `sf` (spot form) | Navigation: `go(view)` pushes onto `hist`, and back pops it. |
| `learnModels` / `modelFor(s)` | the model each spot learns from (`learningModel`): ECMWF or its saved fallback, until another model foretold the sessions there clearly better on 10+ sessions. A change reloads that spot's conditions. |
| `modelMap` | spot id → `SportModel[]` from `learnSpot` (examples here + outings at spots next door, your ranges, the "What works" rows, trees when trained). Recomputed when the diary changes or trees finish training (`treesReady`). |
| `nowBySpot` | Conditions now per spot (key `id`, or `id:model` for other models), 20-minute lifetime. |
| `dayBySpot` | Today's hours per spot (for the best stretch of today). |
| `outlookBySpot` | 6 days of hours, Windy's predictability per day, and today's tides (spot page only). |
| `guessOf(s)`, `bestOf(s)` | The rating now (`Result`) and the best stretch of today (`DayBest`): tiles, map, card. |
| `spotLearned`, `spotParts`, `spotDays`, `spotBest`, `spotTide`, `spotGear` | The spot page's derived data. |

## Data flow

```
Save forecast ──► forecast.captureDay(lat, lon, focusTs, primary, models, layers)
                    ├─ every covering model (ecmwf, gfs, icon, mblue + regional by bounding box), hourly, 25 points
                    ├─ waves (ecmwfWaves → gfsWaves), rain, temperature
                    └─ tide highs/lows (experimental)
                  → Snapshot { ts, models, waves, series }

Log session ────► Session { date (= start), start/end, rating, sport, … , snapshotId }
                  └─ the snapshot's focus moves to the middle of the session (series re-read, no refetch)

Learning ───────► examplesFor(spot, sessions, snapshots, model) → Example[] (forecast saved BEFORE the outing, summed up
                  over it, + rating); learnSpot → SportModel[] (examples, your ranges, "What works" rows, trees)
                  rateBest(models, conditionsNow) → Result {score, level, sport, source, support, reasons}
                  bestToday / nextDays(models, hours) → DayBest (good hours → stretches: tags, When to go, pins)

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
