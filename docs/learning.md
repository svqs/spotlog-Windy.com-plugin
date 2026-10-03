# How spotlog learns (src/lib/predict.ts)

spotlog compares **what the forecast said at the time of each session** with **how the session went**. From that it
learns, per spot and per sport, which conditions work for you and how much each one matters. Everything here is plain
statistics on your own diary, with no machine-learning model and no shared data.

`scripts/test-predict.mjs` checks the main behaviours (12 checks). Run it after any change in this file.

## 1. Conditions per sport

`SPORT_PARAMS` lists the conditions each sport looks at. `paramsOf(sport)` falls back to `Other`, which also covers
the sports people type in themselves.

| Sport | Conditions |
|---|---|
| Windsurf, Kite, Wing | wind, dir, gust, waves, temp, rain |
| Surf | swell, period, swellDir, power, wind, dir, temp, rain |
| Other (and your own sports) | wind, dir, waves, temp, rain |

`SPEC` describes each condition:
- `circular`: true for directions.
- `main` vs extra: the starting importance is 0.5 for main conditions and 0.25 for extras (temp, rain, power).
- `widen`: the least a learned range is widened by.
- `tol`: how far beyond the edge the fit has dropped to 0, at minimum.

**Units inside the learning** are SI: m/s, m, s, kW/m, °C, mm, degrees. **Gusts are a wind speed (m/s)**, not a gust
factor. Ranges from 0.14.0 that were a factor (< 3) are skipped.

## 2. Samples: a session plus its forecast

`samplesFor(spot, sessions, snapshots, model, weight)` turns sessions into `Sample`s.

**Which sessions count**
- Only sessions at the spot that have a saved forecast (`snapshotId`).
- **Time:** `sessionTime(s)` is the start plus half the duration.
- **Forecast:** `forecastFor(snapshot, time, model)` reads the saved day (`series`) at that time:
  - From the spot's **trusted model** (see `wind.ts → trustedModel`), falling back to ECMWF.
  - A session outside the saved hours (±1 h) is **left out**.
  - Old snapshots without `series` count only when saved within 1.5 h of the session.

**Weight and sport**
- Weight 1 by default.
- **0.5** when the felt wind was more than a third away from the forecast (that day says less about the forecast).
- **0.5** for sessions from spots within 3 km (`nearbySpots`, same sports only; done in `plugin.svelte → modelMap`).
- The sample's sport is the session's sport when the spot lists it, else the spot's first sport. A new sport is added to
  the spot when the session is saved, so normally it is listed.

**Tide:** from the tides saved with the day (`tideAt`), or, for older diaries, the one logged by hand.

**"Not worth it, didn't go"** sessions (`checked: true`, rating 2) are real poor samples. They teach what doesn't work
and are excluded from stats and counts.

## 3. Ranges: what works

`rangeOf(spot, sport, key, good)`, in order of priority:

1. **Your own range** (`spot.ranges[sport][key]`, set with Adjust). It always wins.
2. **From great sessions:** good = rating ≥ 4. When there is less than 2 weight of those, good falls back to rating ≥ 3.
   - Needs good samples with at least 2 weight in total (`LEARN.minGood`).
   - Linear conditions: from 6 sessions, the 10th–90th percentile (one odd day doesn't stretch the range); with fewer,
     min–max. Then the range is widened by `max(10 %, spec.widen)` on each side.
   - Directions: each great session's direction ± 20°.
3. **Your wind window:** wind = `spot.min–spot.max`; direction = `spot.dirs` ± 22.5°. Nothing for "I don't know yet"
   spots.
4. Nothing: the condition isn't shown, and it doesn't count.

`ParamModel.from` says which of the three it is (`you`, `sessions`, `window`). The UI says where ranges come from only
when there are some.

**Bias:** the wind window is "how it feels". When comparing the forecast with the window, the forecast is shifted by the
spot's average `felt − forecast` (`forecastBias`).

## 4. Importance: how much a condition decides the day

For each condition, "inside" means fit ≥ 0.99:

```
separation = share of good sessions inside + share of poor sessions (rating ≤ 2) outside − 1      (floored at 0)
importance = (baseWeight × base + poorWeight × separation) / (baseWeight + poorWeight)            (floored at 0.05)
             base = 0.5 for main conditions, 0.25 for extras; baseWeight = 2 (the base counts as 2 poor sessions)
own range  → importance at least 0.8 (you know it matters)
```

- Without poor sessions, importance stays at its base.
- Poor days on which a condition was outside the range push its importance up. Poor days on which it was fine push it
  down.

**In the UI** (the Matters column), `importanceLevel` maps importance to words: ≥ 0.65 "a lot", ≥ 0.35 "some", else
"a little".

## 5. Fit and score

```
fitOf(range, value) = 1 inside; falls linearly to 0 at max(25 % of the edge, spec.tol) beyond it
                      (directions: degrees beyond the nearest centre ± half-width, over 30°)
scoreOf = Σ(importance × fit) / Σ importance   ×   Π(1 − importance) for every condition whose fit is 0
```

The product means that a condition that matters and is clearly off pulls the whole day down.

## 6. The guess

```
fitRating = (Σ rating × weight of sessions whose score ≥ 0.85 + 3.4 × 2) / (their weight + 2)
guess     = 1 + (fitRating − 1) × score
```

- `fitRating` answers "how your sessions went when the conditions fitted". It starts at 3.4 (between good and great)
  counted as 2 sessions, so one session can't swing it.
- `guess(models, conditions)` takes the best sport.
- `shownLevel` maps the rating to a level: ≥ 4.2 epic (5), ≥ 3.5 great (4), ≥ 2.7 good (3). **Below 2.7 nothing is
  shown** ("Not sure yet"). Bad guesses are never shown.
- **The UI names the sport:** "Great for windsurf".

## 7. Best windows

- `bestIn(models, hours, from, to)`: back-to-back **daylight** hours that are good or better, for one sport. The best
  average wins.
- `bestToday` covers the rest of today (tiles, map, "Best today").
- `nextDays` covers the next 5 days (When to go).
- Daylight comes from Windy's `isDay`, then celestial sunrise/sunset, then 6–21 h.

## 8. Other helpers

- **`suggestWindow`:** for "I don't know yet" spots, the directions and wind (±1 m/s) of 2+ great sessions.
- **`learnedWindow`:** "spotlog learned it works best …". It offers the learned wind/direction when they differ from
  your window.
- **`gearHints`:** after 8+ sessions with one piece of gear at a spot (3+ great), the wind it was great in.
- **`tideAt`, `sessionTide`, `bestTide`:** the tide state at a time (Low/Mid/High by thirds between a high and a low,
  Rising/Falling), and the tide most of your great sessions had (needs 2+, a majority).

## Known limits

- **Blunt ranges:** a range is "inside/outside". It doesn't learn a sweet spot within the range, and it doesn't learn
  combinations (for example "W only works above 15 kn").
- **Ranges move slowly:** all sessions count the same, whatever their age. Nothing forgets old seasons yet.
- **Few poor sessions = little learned importance.** "Not worth it, didn't go" exists to help with this.
- **Forecast quality limits everything:** if the model was wrong that day, the sample is wrong. The felt-wind weighting
  and the trusted model only soften this.
- **Rain and temperature** are per hour of the forecast, not the session's actual weather.

Any change to constants (`LEARN`, `SPEC`, the thresholds in `shownLevel` and `importanceLevel`) changes everyone's tags.
Note it in the commit and in `docs/decisions.md`.
