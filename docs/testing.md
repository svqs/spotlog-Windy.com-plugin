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
| 4 | `node scripts/test-predict.mjs` | 16 recommendation groups plus tree-key/scheduling assertions (examples, similar sessions, gates, which forecast to trust, windows, trees, tide) | ~10 s |
| 5 | `npm run check:types` | Types and Svelte warnings: 0 errors, 0 warnings | ~20 s |
| 6 | `python3 harness/e2e.py <dir>` | 50 end-to-end steps through every flow | ~2 min |
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
- save a forecast (preview; no undo bar);
- show on map;
- log a session (no felt ruler/gusts/water; Save waits for a start time; rating, gear, time wheel, GPX), then check the stored session and that the
  tides were saved with the forecast;
- open and swipe-delete (no undo bar);
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
| 9 | The spot on the map: desktop opens a spot with its card, its name brings the card back, hovering another name shows its card, the Windy forecast link; phones: Details without the card, Show on map shows it and the panel steps aside |
| 10 | Drag to rearrange the spots: mouse on desktop (tiles and list, kept after a reload, a click still opens), press-hold-move on phones (a quick swipe doesn't drag) |

Helpers:
- `overflow(pg)`: elements outside the panel.
- `cut_text(pg)`: values and tags cut with "…" (`scrollWidth > clientWidth`).
- `text_problems(pg)`: odd text.

## Unit checks for the learning (scripts/test-predict.mjs)

The script uses `compile-tests.mjs` and `tsconfig.tests.json` to compile lib modules into a fresh temporary output
directory. Unexpected diagnostics stop the run before execution; output is removed on process exit. It then
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

## Locked tooling and validation workflow (0.18)

Use Node 20+ (validated here on Node 24.19.0; CI uses Node 22) and Python 3.13. Direct build/compiler/lint tools and
Svelte 4 are declared and locked; use `npm ci`, rather than a floating install. For browser checks:

```sh
python3 -m venv /tmp/spotlog-tests
/tmp/spotlog-tests/bin/pip install -r harness/requirements.txt
/tmp/spotlog-tests/bin/python -m playwright install chromium
```

Use that Python interpreter for the browser scripts (or activate the environment). `npm run check:fast` covers
lint, words, version consistency, Svelte/TS, core behavior, learning and optional-service boundary tests.
`npm run check` additionally builds. After `npm run rebuild:harness`, start the :8765 server and run
`npm run check:browser` (e2e + scenarios + focused regressions). Browser scripts create their output directories.
Inspect the phone screenshots after they pass. The e2e clock and seeded GPX use 2026-10-04 at noon UTC, so assertions
about Today do not depend on the real time of day; scenarios independently test real timezone/local-date behavior.
Current fixture builders omit removed hand-entered conditions; the legacy builder intentionally includes them.

`harness/regressions.py` checks metadata after movement/rename, reversed same-latitude place responses, delayed
account A after switching to B, reverse-order track imports, malformed series/duplicate ids through reload,
and the extracted Style Lab screens with live copy overrides.
`scripts/test-core.mjs` covers command/merge/lifetime/cache/sync boundaries, SI round trips and midnight/DST clocks.
`test-services.mjs` uses runtime-specific Cloudflare types and actual Worker HTTP/KV behavior; it checks
malformed/null JSON and the shared byte-bounded streaming body reader, including multibyte oversize bodies.
The retained backend-neutral sync controller is tested with injected transports and the harness mock.

After a build, `npm run test:package` verifies that the upload archive contains the minified bundle and required
metadata only, preserves the bundle bytes and leaves the local manifest intact. CI also repeats the e2e flow
against the minified bundle: `SPOTLOG_TEST_URL='http://localhost:8765/harness/index.html?bundle=min' python3 harness/e2e.py /tmp/spotlog-e2e-min`.
The Design Lab continues to use the development bundle.
Embedded preview pages clear only the generated manifest's build timestamps, so rebuilding them is reproducible;
the plugin and upload manifest keep their real timestamps.

`npm run test:learning` adds 46 synthetic diary scenarios through validation, direct learning and the application's
cached controller: four-log reconciliation, excluded forecasts, multiple sports/spots, sequential saves/edits/undo,
reload/import/merge, legacy/DST coverage, gear/model gates and up to 600 long-term outings. It also characterizes
the known equal-distance order sensitivity. JSON evidence and browser fixtures go to `/tmp/spotlog-learning`.
After it, `npm run test:learning:browser` checks eight desktop/phone and actual-form cases with screenshots in
`/tmp/spotlog-learning-browser` (requires :8765). Both are included in the fast/browser commands respectively.
Findings and documentation cleanup suggestions: [session learning review](reviews/learning-scenarios-and-documentation-2026-10-04.md).

The optional tide worker also has its own type check:

```sh
npx --no-install tsc --project tide-worker/tsconfig.json
```

Supabase/Deno files and their checks were removed in 0.18.1. No diary sync server is included or enabled.

`.github/workflows/validate.yml` has read-only repository permissions, uses `npm ci`, rebuilds and compares committed
pages, runs browser checks and uploads screenshots. The separate publish workflow remains manual and secret-gated.
Rollup forwards all warnings except the named host accessibility case; Svelte-check still fails warnings.
`skipLibCheck` isolates errors in Windy's supplied declaration packages, not application diagnostics.

To reproduce the performance comparison, supply the original 0.17 bundle:
`python3 harness/performance.py /tmp/spotlog-performance /path/to/original/dist/plugin.js`.
It instruments skill/example calls in each compiled bundle and measures three runs for 100/300/600 qualified
outings at one spot with three models. The report records the browser/OS, startup, units changes and long tasks.
Budgets and evidence are in the implementation review; those hardware timings are diagnostic, while zero redundant
learning calls is asserted. Full-document saves and initial leave-one-day-out model skill still scale with diary size.
