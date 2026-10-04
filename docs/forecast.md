# Forecasts, models and tides (src/lib/forecast.ts, src/lib/wind.ts)

## Fetching

- `fetchPayload(model, lat, lon)` calls Windy's `getPointForecastData(model, {lat, lon, step: 1}, {summary: true,
  celestial: true})`:
  - hourly steps where the model has them;
  - weather models also return Windy's daily summary (predictability) and sunrise/sunset;
  - wave models (`ecmwfWaves`, `gfsWaves`) are fetched without the extras.
- **Cache:** exact coordinates + model identify requests, reused in flight for 20 minutes, with a 512-entry bound.
  Failed/unusable payloads are evicted and return null (logged with console.info), so the next load can recover.
  Tide requests are bounded at 128 entries/10 minutes (including entitlement in the key).
- **UI controller:** injected sources share condition/hour requests (256 entries/20 minutes), available models
  (128/20 minutes) and outlook (128/10 minutes). Empty answers/rejections can retry. Account changes clear UI caches;
  location/model/entitlement changes invalidate derived values. Completions check both coordinates and current ownership.
- **Host boundary:** `adapters/windy.ts` validates the unknown point payload before forecast readers use it. Shared
  `forecast-values.ts` maps weather/wave columns; each reader keeps its own nearest-hour tolerance and wave fallback.
- **Units:** values are converted to SI on read (temperature K → °C). Wind is m/s, rain (`precipAmount`) is mm per step.

## Models

| Kind | Models | Used |
|---|---|---|
| Global | ecmwf, gfs, icon, mblue | everywhere |
| Regional (by bounding box, `modelsFor(lat, lon)`) | iconEu, arome, iconD2, ukv, czeAladin, hrrrConus, canHrdps, jmaMsm, bomAccess, aromeAntilles, aromeReunion, namHawaii | where the box covers the spot; a model that still has no data there is skipped |
| Waves | ecmwfWaves → gfsWaves | snapshots and conditions now: the first one with data; the hourly outlook (When to go, best today) uses ecmwfWaves only |

**Settings:** "Save every model" (the default) saves every model that covers the place. Otherwise only the ones picked
(`settings.models`).

## Snapshots ("Save forecast")

`captureDay(lat, lon, focusTs, primary, models, layers)` saves **the next 24 hours from the hour it is taken**, as 25
hourly points.

- **Per model:** wind, gust, dir, temp (if the temp layer is on), rain.
- **Waves:** waves/dir, period, power, swell 1 (height/period/dir), each one if its layer is on.
- **Tides:** high/low times (and heights) in the window, plus the one before and after (Windy Premium only, see Tides below).

The snapshot keeps `ts`/`models`/`waves` for the focus hour plus the whole `series`. Logging a session moves the focus to
the middle of the session without refetching (`seriesAt`).

Windy only serves forecasts from today on, so **past days can't be captured**. That's why the app nudges you to save
before going out.

## Conditions now, hours, outlook

| Function | Returns | Used for |
|---|---|---|
| `conditionsNow(lat, lon, model)` | wind + waves now | tiles, map card, spot page |
| `hoursToday` | from 3 h ago to the end of today | best stretch today |
| `hoursBetween` | from–to | the spot page's 6-day outlook (When to go) |

Each hour carries wind, gust, dir, temp, rain, waves/swell/period/power and a **daylight** flag (Windy's `isDay`, else
celestial sunrise/sunset ± 30 min, else 6–21 h).

## Predictability ("% sure")

`predictability(lat, lon, model)` reads `summary[].predictability` (0–100) per day. It's **Windy's own** number for how
much the models agree about that day. spotlog shows it under the day in When to go. It is **not** part of the rating:
spotlog's tag says how good the conditions would be **for you**, and Windy's % says how likely the forecast is to hold.

## The model a spot uses

- Learning and recommendations use **one model per spot**: ECMWF, which is global. Only where ECMWF has no forecast is
  one covering model chosen once and saved as `spot.recommendationModel` (`plugin.svelte → chooseFallbackModel`).
- **That changes when another model has clearly foretold your sessions there better** on 10+ sessions ("Which forecast
  to trust here", `predict.ts → learningModel`). The spot then learns from it, and the section says so.
- A saved forecast without that model can't teach that spot.
- The spot page's model switch only changes what you **look at**, never what spotlog learns from.
- **Which forecast to trust here** ranks the models by how well their forecasts foretold your session ratings
  (`learn/skill.ts`, see docs/learning.md §8). The old felt-wind ranking and bias were retired in
  0.16, because felt wind was often prefilled and shared saved days skewed it.

## Tides (experimental, Windy Premium only)

The tide comes from **Windy's own tide forecast only** (WorldTides data, FES2022 model), through `src/lib/tides/`
(from the tide research, 0.17):

- `tides/tides.ts`: the Premium check (`@windy/subscription → hasAny`), the request (`getTideForecastUrl` + `http.get`,
  10 s timeout, one retry), the error handling and the error reports. Never throws.
- `tides/tideCore.ts`: pure logic, unit-tested in `scripts/test-predict.mjs`. It reads Windy's answer strictly
  (`{ header: { copyright }, data: { hours, types: 'High'|'Low'|null, heights } }`, 7 days from 00:00 UTC), drops
  micro-tide wiggles under 5 cm, and `highsAndLows()` turns it into the saved day's highs and lows.
- `forecast.ts → tideBetween / tideToday` ask once per place every 10 minutes and return `{ day, needsPremium }`.

**Who gets tide:**

| User | Result |
|---|---|
| Windy Premium | Tide is saved with every forecast; "Tide today" shows in the forecast card's full snapshot |
| Not Premium | No tide, no request. The full snapshot says "Tide today: with Windy Premium" (the tooltip explains why) |
| Premium, but Windy fails | The forecast is saved without tide, and a small error report is sent (below) |

**What's saved:** `series.tide = { highs, lows, highsM, lowsM }` (times and heights in m) from the saved window, plus
the high/low just before and after it (estimated by mirroring when Windy's window starts later), so every hour sits
between a high and a low. The session's tide is worked out from these (`learn/tide.ts → tideAt`). **Users never enter
the tide.** The heights are kept so spring and neap tides can be learned later.

**Error reports** (`TIDE_REPORT_URL` in `src/lib/links.ts`; empty = off). For Premium users only, when Windy's endpoint
times out, fails, moves or changes its answer: the kind of error, the HTTP status, the answer's structure without any
values, the plugin version and the time. No coordinates, no user id, at most one per error kind per day per browser.
The endpoint is the Cloudflare Worker in `tide-worker/` (see its README for deploying it and reading reports).

**Credits:** the data licence asks for attribution, so `tideCredits` is shown at the bottom of How it works.

**Before publishing publicly:** `getTideForecastUrl` is internal to Windy (`@ignore` in their typings), so ask Windy
first. Windy says the tide data is licensed per end user: keep it in each user's own diary, as now. Predictions are
astronomical only (no storm surge or wave setup).

## Tide algorithms intentionally remain separate

`learn/tide.ts` classifies saved high/low **times** into High/Mid/Low by thirds of the interval, and Rising/Falling;
it rejects missing neighbors, equal types or gaps over nine hours. It has no height input. `tides/tideCore.ts` reads
Windy's validated time/height series, interpolates height in metres (with a cosine fallback), mirrors boundary extremes,
and returns a continuous range fraction plus an approximation flag. Their timestamps use ms, but the phase semantics
and coverage/fallback rules differ. Combining them would change learned hints, so 0.18 shares no phase algorithm.
