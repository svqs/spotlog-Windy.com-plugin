# Testing

spotlog is tested against a **fake Windy**: `harness/mock-windy.js` implements the parts of Windy's plugin API that
spotlog uses, with synthetic but realistic data. The tests drive the **real compiled plugin** (`dist/plugin.js`) in
Chromium via Playwright.

## The checks (all must pass before a commit)

| # | Command | What it proves | Time |
|---|---|---|---|
| 1 | `npm run build` | It compiles (Rollup + Svelte + TS) | ~10 s |
| 2 | `npm run lint` | ESLint clean (no-use-before-define, no-shadow, braces, imports…) | ~10 s |
| 3 | `python3 scripts/check-words.py` | Every phrase used exists in `copy.ts`, none duplicated, none unused | 1 s |
| 4 | `node scripts/test-predict.mjs` | 15 recommendation checks (examples, similar sessions, gates, which forecast to trust, windows, trees, tide) | ~10 s |
| 5 | `npx -y svelte-check@3 --workspace . --threshold warning` | Types and Svelte warnings: 0 errors, 0 warnings | ~20 s |
| 6 | `python3 harness/e2e.py <dir>` | 51 end-to-end steps through every flow | ~2 min |
| 7 | `python3 harness/scenarios.py <dir>` | Data sizes, odd data, viewports, units, time zones, learning, phone cross-check | ~4 min |

Checks 6 and 7 need a static server on port 8765 from the project root:
`(curl -s localhost:8765 >/dev/null || (python3 -m http.server 8765 >/dev/null 2>&1 &))`. Both write screenshots to
`<dir>`.

After `npm run build`, also rebuild the pages that embed the plugin: `python3 harness/assemble.py` (sandbox) and
`node scripts/build-lab.mjs` (Style Lab). The committed `harness/sandbox.html` and `harness/stylelab/*` must match the
code.

## The fake Windy (harness/mock-windy.js)

It fakes:
- the Leaflet map, markers and popups (`window.L`);
- `W.map`, `W.store` (timestamp, user, subscription, userToken), `W.singleclick`, `W.broadcast`, `W.reverseName`;
- `W.fetch.getPointForecastData`:
  - per-model synthetic series;
  - `summary` predictability and `celestial`;
  - ecmwf, gfs, icon, iconEu, arome, mblue and both wave models; AROME fails south of 41°N, and the other regional
    models always fail (so "not available here" is tested);
- `getTideForecastUrl` + `http.get`: tide extremes every 6.2 h, from 3 days back to 7 days ahead;
- a fake sync server keyed by Windy user id (`window.__spotlogCloudMock`).

Pages:
- `harness/index.html` starts with empty data. A viewport ≤ 760 px gives the phone layout (the mock's `isMobileOrTablet`).
- `harness/sandbox.html` has example data. It's the single file published as the Sandbox artifact.

## e2e (harness/e2e.py)

One long story. Each `ok(...)` is a step:
- add a spot from the map;
- save a forecast (preview, undo);
- show on map;
- log a session (no felt ruler/gusts/water; Save waits for a start time; rating, gear, time wheel, GPX), then check the stored session and that the
  tides were saved with the forecast;
- open, swipe-delete and undo;
- units;
- forecast at my location;
- log from the last forecast; log without a place, then link it;
- gear;
- account sync (fake server), two tabs, tombstones;
- the account gate (logged in is enough, no Premium);
- "I don't know yet" spots;
- When to go and What works here (fold-out, Adjust, back to learned);
- the phone bar + panel; touch typing.

## Scenarios (harness/scenarios.py)

| § | What |
|---|---|
| 1 | Big diary (30 spots, 500 sessions, 200 saved days): load time, no errors |
| 2 | Old and broken diaries: no welcome mark, missing fields, bad items skipped, broken JSON starts fresh; old felt/gusts/water fields are dropped while the sessions stay |
| 3 | Viewports 320 → 1920, every tab: nothing sticks out, no cut values, no odd text (`undefined`, `NaN`, `{placeholders}`) |
| 4 | Every wind unit + ft + °F on home and the spot page |
| 5 | Time zones and locales: a session logged today lands on today |
| 6 | Learning per spot and sport (multi-sport spot, What works per sport, the sport chips, your own sport under "Other…") |
| 7 | "Not worth it, didn't go"; the map card (rating, no symbol list); linking earlier sessions to a new spot; the phone spot page |
| 8 | **Phone cross-check:** every screen (spots, map card, spot page parts, Adjust, log form + "Other…", spot form, tabs) at 320/360/390/430, with screenshots `x<width>-<screen>.png` |

Helpers:
- `overflow(pg)`: elements outside the panel.
- `cut_text(pg)`: values and tags cut with "…" (`scrollWidth > clientWidth`).
- `text_problems(pg)`: odd text.

## Unit checks for the learning (scripts/test-predict.mjs)

The script compiles `src/lib/predict.ts` (and `learn/`) with `tsc` into `node_modules/.cache/spotlog-predict` and
asserts behaviour, not numbers to the decimal:
- **examples:** a forecast saved after the start doesn't teach; one saved day shared by two sessions gives each its own
  hours; overnight and daylight-saving outings; start-only and old single-hour saves are marked limited; gaps and
  missing surf data exclude;
- **similar sessions:** nothing without a window; the saved window gives Good from your range; poor-only outings never give Good; mixed outcomes; Great/Epic evidence; spots next door are never
  evidence; each logged session counts, also several on one day; distances wrap round north, and a missing extra never looks closer;
- **which forecast to trust:** the model whose forecasts foretold the sessions best ranks first, and becomes the learning model after 10 sessions;
- **windows:** hour by hour (a single good hour is a stretch), no bridged gaps, a longer near-equal stretch wins, per sport, calm days stay
  empty;
- **trees:** not eligible with little data; deterministic with lots; picked up after background training, dropped
  after a diary change;
- **tide.**

When you change `learn/config.ts`, update the expectations only if the new behaviour is what you want, and say why in
the commit.

## Writing new tests

- **Prefer behaviour over pixels.** Assert stored data (`stored(pg)` / `localStorage`) and visible text. Take a
  screenshot for anything visual.
- **Scroll before dragging.** Before a drag or a precise click, `scrollIntoView({block: 'center'})`, because the sticky
  Save bar can cover elements near the bottom.
- **New UI?** Make sure scenario §8 visits it, so it gets checked on phones.
- **Data shape changes:** add an "old diary" case in §2.

## Not covered by the fake Windy

These must be checked in real Windy:
- Windy's real CSS around the pane;
- the real closing ✕;
- `poi-label` clicks;
- whether these really exist and look as expected: hourly `step: 1`, `summary` predictability, `celestial`, regional
  model coverage, the tide endpoint's real answer.

**How to test in real Windy:**
- **Developer mode (no publishing):** run `npm start` on the computer with the browser, then load
  `https://localhost:9999/plugin.js` at windy.com/developer-mode.
- **Or a published test version** (the owner's OK only, see `docs/operations.md`): load its install URL at
  windy.com/plugins. That installs it for her account, so it reaches her phone too.

Either way, look around without changing the real diary.
