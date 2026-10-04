# Forecasts, models and tides (src/lib/forecast.ts, src/lib/wind.ts)

## Fetching

- `fetchPayload(model, lat, lon)` calls Windy's `getPointForecastData(model, {lat, lon, step: 1}, {summary: true,
  celestial: true})`:
  - hourly steps where the model has them;
  - weather models also return Windy's daily summary (predictability) and sunrise/sunset;
  - wave models (`ecmwfWaves`, `gfsWaves`) are fetched without the extras.
- **Cache:** results are cached per model and place (3 decimals) for 20 minutes. A model that doesn't cover the place
  returns `null` quietly (logged with `console.info`).
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
- **Tides:** high/low times from 8 h before to 8 h after the window (when Windy has them).

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
- A saved forecast without that model can't teach that spot.
- The spot page's model switch only changes what you **look at**, never what spotlog learns from.
- The felt-wind model ranking ("Which forecast to trust") and the felt-wind bias were retired in 0.16. Felt wind was
  often prefilled from the forecast, and one saved day shared by several sessions skewed the comparison.

## Tides (experimental)

- **Source:** `tideBetween(lat, lon, from, to)` uses Windy's `getTideForecastUrl` + `http.get`. This is undocumented for
  plugins.
- **Reading:** `readTides` accepts a list of extremes (`{ts|time, type: high|low}`) or `ts` + heights (it finds the
  turning points). The first answer's shape is logged once (`[spotlog] tide answer`) so the parser can be fixed against
  real data.
- **On screen:**
  - "Tide today" (times of highs/lows) shows only when parsing works.
  - The session tide is computed from the saved highs/lows (`learn/tide.ts → tideAt`). **Users never enter the tide.**
- **Open:** where the tide data should come from long-term (Windy's tide feed vs another source) still needs research.
  It's parked for now.
