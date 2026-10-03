# AGENTS.md: start here

This is the entry point for anyone (human or agent) changing or reviewing **spotlog**, a private Windy.com plugin.
Read this page first, then the doc in `docs/` that matches your task.

## What spotlog is

A session diary inside Windy for wind and wave sports:

1. You **save the forecast** before you go out. Spotlog keeps the next 24 hours from every model that covers the place, plus waves and tides.
2. You **log the session** afterwards: rating 1–5, how strong the wind felt, gear, an optional GPS track.
3. Spotlog **learns, per spot and sport, what works for you**. It then rates today and the next days ("Great for windsurf"),
   ranks which forecast model to trust at each spot, and lights up spots on the map.

It is a client-side Svelte 4 + TypeScript plugin built with Windy's plugin template (`@windycom/plugin-devtools`).
There is no backend of its own yet. The diary lives in the browser's `localStorage` on windy.com, and an optional sync
server is prepared in `supabase/`.

## Ground rules

These rules come from the owner (Sophia, a designer at Windy). Breaking one is a bug, even when the code "works".

**Product and UI**
- **Name:** in UI text it's **"spotlog"**, lowercase, with the pixel star. Use `{spotlog}` / `{Spotlog}` in `copy.ts`.
  The wordmark stays **SPOTLOG**.
- **Background:** keep the dark background and the existing look. Don't change the **desktop UI unless asked**.
  Phone layout fixes are always welcome.
- **Wording:** every word on screen lives in `src/lib/copy.ts`. No hard-coded UI strings. Keep the tone casual, friendly
  and plain.
- **No symbols that need explaining** (✓ ~ ✕, bars with a legend…). Use words ("a little / some / a lot") or colour that
  speaks for itself.
- **Naming matches the metric** everywhere: Wind, Wind direction, Gusts, Waves, Swell, Swell direction, Swell period,
  Wave power, Temperature, Rain.
- **Units:** values are stored in SI (m/s, m, °C, mm) and always shown in the units the user picked in the header pill.
  Gusts are a wind speed like wind.
- **Ratings are per sport.** Tags say so: "Good / Great / Epic for windsurf". Below "good", show "Not sure yet", never a
  negative guess.
- **The user never enters the tide.** It comes from Windy's tide forecast, saved with the day (experimental, see
  `docs/forecast.md`).
- `docs/decisions.md` lists more decisions like these. Read it before you "simplify" something back.

**Code and data**
- **Never lose user data.** Every new stored field is validated in `storage.ts → normalise()` (snapshot series are the one exception, see `docs/data-model.md`). Old diaries must keep
  loading. Deletes use tombstones (`deleted`) and undo/upload use `revived`.
- **Secrets:** the `WINDY_API_KEY` lives only in GitHub Actions secrets. Never write it to a file, a log or the repo.
- **Publishing** (`publish-plugin` workflow or `scripts/publish.sh`) uploads a new version to windy-plugins.com. **Only
  run it when the owner explicitly asks for it in this conversation.** She publishes to her phone herself.
- **Versions:** bump `version` in both `package.json` and `src/pluginConfig.ts` for every change you ship.

## Commands

| What | Command |
|---|---|
| Build `dist/plugin.js` + `.min.js` | `npm run build` |
| Rebuild the sandbox page (fake Windy + real plugin) | `python3 harness/assemble.py` |
| Rebuild the Style Lab pages | `node scripts/build-lab.mjs` |
| Lint | `npm run lint` |
| Every phrase exists and is used | `python3 scripts/check-words.py` |
| Learning unit checks | `node scripts/test-predict.mjs` |
| Svelte/TS type check | `npx -y svelte-check@3 --workspace . --threshold warning` |
| End-to-end (52 steps, needs a server on :8765) | `python3 -m http.server 8765 &` then `python3 harness/e2e.py /tmp/shots` |
| Scenarios (data sizes, units, time zones, viewports, phone cross-check) | `python3 harness/scenarios.py /tmp/scen` |

Playwright for Python is needed for the e2e tests and scenarios, and Chromium must be installed for it. All checks must
pass before a commit. `docs/testing.md` explains each one and what to do when one fails.

## Where things are

```
src/plugin.svelte      the whole app: screens, navigation, map, actions (big; see docs/architecture.md for its anatomy)
src/ui/*.svelte        small components: SnapCard, FeltSlider, TimeWheel, SwipeRow, Calendar, Settings, Icon, Brand, PixelStar
src/lib/predict.ts     the learning: what works per spot and sport, the rating guess, best windows   → docs/learning.md
src/lib/forecast.ts    Windy forecast fetching, whole-day snapshots, models per region, tides         → docs/forecast.md
src/lib/storage.ts     load / save / validate / merge / import / export                               → docs/data-model.md
src/lib/types.ts       the data model
src/lib/wind.ts        directions, colours, sports, gear presets, model ranking (which forecast to trust)
src/lib/units.ts       unit conversion and formatting
src/lib/copy.ts        every phrase (grouped by screen)                                              → docs/ui-and-copy.md
src/lib/theme.ts       every colour, shape and map mark (Style Lab tokens)
src/lib/design.ts      a Style Lab design applied on top (normally empty: designs are folded into theme.ts / copy.ts)
src/lib/cloud.ts       optional account sync client; supabase/ has the server
harness/               fake Windy (mock-windy.js), test pages, sandbox + Style Lab builders, e2e + scenarios
scripts/               build-lab, apply-design, check-words, test-predict, publish
docs/                  the documentation (index: docs/README.md)
docs/reviews/          dated findings from code and product reviews (index: docs/reviews/README.md)
docs/specifications/   proposed behavior and implementation plans (index: docs/specifications/README.md)
```

## Reviews and specifications

- Start at `docs/reviews/README.md` when investigating known issues. Name new reviews for their subject and date, and add them to that index.
- Start at `docs/specifications/README.md` when planning a larger change. Put the intended behavior, migration, and acceptance checks in a subject-specific file, then add it to that index.
- Reviews describe findings; specifications describe proposals. Neither changes the current behavior by itself. For code that has shipped, use the topic docs above and `docs/decisions.md` as the current reference, and update them when implementation lands.

## How to make a change

1. Read the relevant doc and the code around your change. `plugin.svelte` is long, so search it, for example
   `grep -n "/\* ----------" src/plugin.svelte` for its sections.
2. Make the change:
   - New words go into `copy.ts`, never into templates.
   - New stored fields go into `types.ts` **and** into `normalise()` in `storage.ts`.
   - New colours go into `theme.ts`.
3. Add or update tests. Use `harness/e2e.py` for flows, `harness/scenarios.py` for layout, data and edge cases, and
   `scripts/test-predict.mjs` for learning math.
4. Run all the checks in the table above, then look at the phone screenshots the scenarios write. Look at them, don't
   trust the checks alone.
5. Bump the version (both files) and rebuild (`npm run build && python3 harness/assemble.py && node scripts/build-lab.mjs`),
   so the committed `harness/` pages match.
6. Commit with a message that says what changed for the user. Push to `main`.
7. Update the docs when a decision, a data field or a flow changed.

## Gotchas

- `plugin.svelte` uses Svelte 4 reactive declarations (`$:`), so helper "functions" are often reactive arrows. Lint
  forbids use-before-define for `const`. Use `function` declarations when order matters.
- Lint forbids shadowing. Watch out for names like `name`, `spot`, `f` and `data`, which already exist in the outer scope.
- Windy's global CSS leaks into the pane. The plugin's classes are Svelte-scoped, but generic properties can still be
  inherited. Check the real look in Windy.
- The e2e felt-ruler drag needs the ruler centred on screen (the sticky Save bar can cover it).
- Don't run `pkill` inside chained shell commands in this environment. Start the test server with
  `(curl -s localhost:8765 >/dev/null || (python3 -m http.server 8765 >/dev/null 2>&1 &))`.
- Parts that are **unverified in real Windy** (they're experimental and fail quietly):
  - hourly `step: 1`
  - `celestial` (daylight)
  - `summary` predictability
  - regional models
  - the tide endpoint
