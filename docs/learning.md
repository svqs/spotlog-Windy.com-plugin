# How spotlog recommends (src/lib/predict.ts + src/lib/learn/)

Recommendation v2, built from [the specification](specifications/recommendation-v2-spec.md). spotlog compares **the
forecast you saved before an outing** with **how the outing went (1–5)**. It then rates new forecasts from the most
similar past outings, per spot and per sport. Everything runs in the browser on your own diary. There is no shared
data and no server.

`node scripts/test-predict.mjs` checks the behaviour (16 groups, with extra cache and scheduling assertions). Run it after any change here.

## The modules

```
src/lib/predict.ts        the public face: learnSpot, trees in the background, wind window and gear helpers, re-exports
src/lib/learn/config.ts   EVERY number below, in one place (change them only there; bump ALGORITHM_VERSION)
src/lib/learn/features.ts what each sport looks at, summing a stretch of hours up, the distance between two forecasts
src/lib/learn/examples.ts sessions → training examples (the only way data enters the learning)
src/lib/learn/similar.ts  weighted similar sessions + your ranges + the evidence gates
src/lib/learn/trees.ts    gradient-boosted regression trees and their walk-forward check
src/lib/learn/model.ts    one sport at one spot (SportModel) and rate() = similar sessions, blended with trees when earned
src/lib/learn/windows.ts  when to go: good hours → stretches → the best one
src/lib/learn/ranges.ts   your ranges (the prior) and the descriptive "What works here" rows
src/lib/learn/tide.ts     tide state from saved highs/lows, the tide your best outings had
src/lib/learn/skill.ts    which forecast to trust here: how well each model's forecasts foretold your sessions
```

**Data flow:** `learnSpot()` → `examplesFor()` → `sportModel()` (prior + rows) → `rate()` / `bestIn()` in the UI.

## 1. Features per sport (features.ts)

| Sport | Core (required, weight 2) | Extra (optional, weight 1) |
|---|---|---|
| Windsurf, Kite, Wing, Other (and your own sports) | wind, dir | gust, waves, temp, rain |
| Surf | swell, period, wind | swellDir, dir, power, temp, rain |

- Units are SI; directions are in degrees.
- Swell falls back to the total wave height, and period and direction to the waves' values, when the forecast has no
  swell figure.
- **A forecast without all core features is never rated** ("Not sure yet"). For example, a surf spot with no wave data
  never gets a tag.

**Summing a stretch up** (`summarize`, used for outings and future windows alike):
- median wind, waves, swell, period, temperature and wave power;
- **max** gust and rain;
- **circular mean** for directions.

**Distance** between two forecasts:

```
distance² = Σ weight × (difference / SCALE)² / Σ weight   over the sport's fixed feature set
```

- SCALE: wind/gust 3 m/s, waves/swell 0.75 m, period 3 s, temperature 8 °C, rain 2 mm, power 10 kW/m, directions 45°.
- Direction differences go the shortest way round the compass.
- A missing extra counts as difference 1, so missing data never looks closer.
- A missing core feature means the two forecasts can't be compared.

## 2. Training examples (examples.ts)

One example per session at a spot. A session **teaches only when all of these hold**:

The “learned from … sessions, … great” line counts eligible actual outings **for that sport**, across its whole
local history; great includes ratings 4 and 5. Excluded sessions stay in the diary. It is separate from the ten
neighbors used for a prediction. Tests and a reproduced log-flow explanation: [session learning review](reviews/learning-scenarios-and-documentation-2026-10-04.md).

| Rule | Why | Skip reason |
|---|---|---|
| rating 1–5 | the outcome | `rating` |
| a saved forecast is linked | nothing to learn from otherwise | `no forecast` |
| it was **saved no later than the start** (`savedAt > 0 && savedAt <= start`) | only what you could have known beforehand | `saved after start` |
| it belongs to the spot or was saved within 1 km | right place | `other place` |
| it has the spot's recommendation model | one model per spot, consistently | `model missing` |
| it covers the outing, with no gap over 1.5 h | the whole session, not a guess | `not covered` / `gap` |
| the sport's core features are there | comparable | `missing core` |

**Time**
- `session.date` is the start instant.
- The end clock is read in the session's own time zone (`tz`). An end before the start is the next day, and
  daylight-saving changes are handled.
- **With start and end:** the saved hours inside the outing are summed up.
- **Start only:** the nearest hour, marked `limited`.
- **Old sessions without a start clock, and old single-hour saves:** used when they fit, also marked `limited`.

**What else an example records**
- **Kinds:** an outing, or a **"Not worth it, didn't go"** day (`checked`). Didn't-go days are a weak preference signal:
  weight 0.25, and they never count as evidence for a tag.
- **Provenance:** `from = {snapshotId, model, hours, limited}` lives only on the derived example, never in the diary.
- **Tide:** from the tides saved with the day.

The sport is the session's own sport when the spot lists it, else the spot's first. Logging a new sport adds it to the
spot.

## 3. Weighted similar sessions: the default model (similar.ts)

For a forecast `x`, per sport:

1. **Neighbours:** the 10 closest examples within distance 2. Each one's weight is

   ```
   base × exp(−distance² / 2)
   ```

   - base 1 for a local outing;
   - base 0.25 for an outing at a spot within 3 km;
   - base 0.25 for a local "didn't go" day.
2. **Caps:**
   - all nearby-spot examples count at most 2 in total;
   - a per-day cap (`SIMILAR.dayCap`) exists but is **off**: each logged session is its own example, since sessions
     on one day can go differently (tide, time of day).
3. **Your ranges as a starting preference** (ranges.ts → `priorOf`):
   - Ranges you set with Adjust win, per parameter. Your wind window covers wind and direction.
   - `userFit` is the fit of the **worst** of your ranges (1 inside, falling to 0 a tolerance beyond the edge).
   - `priorRating = 1 + 2.4 × userFit` (at most 3.4).
   - Weight 2 (`PRIOR.weight`): a saved wind window counts as yours. None for "I don't know yet". When your
     sessions show something else, the spot page suggests it ("spotlog learned it works best … Use this").
4. **Score:**

   ```
   score = (Σ weight × rating + priorWeight × priorRating) / (Σ weight + priorWeight)
   ```

   It's a 1–5 number, not a probability.

## 4. Evidence: when a tag may show

Only **local actual outings** among the neighbours count as evidence. Spots next door and didn't-go days don't.

| Tag | Needs |
|---|---|
| any learned tag | effective support `N_eff ≥ 3`, at least one similar local outing rated 3+, and one within distance 1 |
| Good from your range | a range you set or the wind window you saved (no outings needed); shown as "From the wind window you set for this spot" |
| Great | at least 3 similar local outings rated 4+ |
| Epic | at least 6 similar local outings rated 4+, including two 5s |
| never | when every similar local outing was rated 1–2 |

- Effective support: `N_eff = (Σw)² / Σw²` over the similar local sessions. Each logged session counts, also
  several on one day.
- The score's cut-offs are 2.7 good, 3.5 great, 4.2 epic. A tag is the lower of the score's level and what the evidence
  allows.
- Below Good, the result is "Not sure yet", with a reason: few sessions, only poor sessions, below good, missing
  forecast, or outside what the trees saw.

Every result is structured (`Result`): score, level, sport, source (`user range` / `similar sessions` /
`boosted trees`), support, N_eff, nearest distance, cap and reasons.

## 5. Boosted trees: the larger-data model (trees.ts)

Small gradient-boosted regression trees on the same features.

- **Build:** depth ≤ 2, ≥ 10 examples per leaf, learning rate 0.05, 100 trees.
- **Encoding:** directions as sine/cosine; extras get a missing-indicator; missing values are filled with the training
  means.
- Pure TypeScript, deterministic, no library.

**May be used** (`treesEligible`) only for a spot and sport with 100+ actual local outings on 30+ days, with 20+ rated
≤ 2 and 20+ rated ≥ 3. Spots next door and didn't-go days don't count.

**Must win** (`trainTrees`): a walk-forward check.
- The last 40 % of days are predicted in up to 5 chronological blocks, each from the days before it. A day is never
  split.
- The trees are used only when their mean error is ≥ 5 % lower than similar sessions on ≥ 20 held-out outings **and**
  they don't call more poor outings Good. They are then retrained on everything.

**In use:**
- score = 70 % trees + 30 % similar sessions (50/50 when you have your own ranges or a wind window);
- the same evidence gates apply;
- outside the range of core values the trees saw: "Not sure yet".

**Training** uses deterministic cooperative generator batches, with an 8 ms yield target checked between fitted
trees, and a serial job queue. An individual tree can exceed the target; this is cooperative scheduling, not a hard
real-time guarantee. Unit checks confirm timer progress, cancellation and equality with synchronous reference math.
No worker-loading assumption is introduced into Windy.

Exact sorted effective-input keys include algorithm version, spot/sport, prior, model/features, outcome, kind, day,
start and coverage/provenance. Cached successes, failures and pending jobs share that identity; obsolete jobs cannot
commit. Only current model keys remain cached. Failures retain similar-session fallback. Thresholds and algorithm
version are unchanged because scoring math did not change.

The learning controller indexes sessions/snapshots, shares model examples between skill and sport models, reuses skill
for model selection and trust display, and caches today's best per model/hour identity and minute. Units, navigation
and notes-only edits do not evaluate examples/skill or train trees. Entity arrays are immutable command outputs;
a meaningful edit invalidates its spot and relevant neighbors. Recorded timezone helpers live in `lib/time.ts`, with
bounded formatter reuse. Performance evidence and remaining costs: [0.18 implementation](reviews/code-optimization-implementation-2026-10-04.md).

## 6. When to go (windows.ts)

- **Runs:** daylight forecast hours split wherever an hour is missing. A gap is longer than 1.5 × the hours' own step,
  so a model's native 3-hour steps aren't gaps.
- **Hours:** each forecast hour is rated on its own, like a session (`WINDOW.hours = 1`, the owner's choice for the
  finest times). Longer windows are one setting away; then every hour in them must be Good and so must the window as
  a whole.
- **Stretches:** good hours next to each other merge into one stretch, so a single good hour is a one-hour stretch.
  Its rating is the hours' mean score, and its level is capped by the weakest hour's evidence.
- **Best:**
  - the highest mean;
  - within 0.2: the longer stretch, then the earlier one.
  - Each sport is scored separately, and the tag names the sport that matched.
- **Range:** `bestToday` covers the rest of today (tiles, map, card); `nextDays` covers the next 5 days (When to go).

Windy's predictability "% sure" is shown next to the day. It is a separate forecast-uncertainty signal and never changes
the score.

## 7. "What works here" (ranges.ts → `describe`)

Per feature of the sport, in this order:
1. **A range you set** with Adjust (marked with a dot).
2. **Your outings:** the weighted 10th–90th percentile of local outings rated 4+, once there are 3 of them. Days count
   once, so the weight is 1 ÷ outings that day.
   - A gap wider than the feature's scale with a poor outing inside splits it into separate spans, shown like
     `6–9 · 12–15 m/s`.
   - Directions are shown as the compass sectors they fell in.
   - Each logged session counts once.
3. **Your wind window** (wind and direction).

These describe where your well-rated outings were. They are not "optimal" ranges, and they don't drive the score;
similar sessions do.

**Matters** (a little / some / a lot) is descriptive too. It shows how well the range sets your great and poor outings
apart, starting from "some" (core) or "a little" (extras).

## 8. Which forecast to trust here (skill.ts)

- **Per spot**, for every model saved with your sessions: each session is guessed from your sessions on other days
  (leave one day out), with weighted similar sessions on that model's forecast values. The miss is the difference
  between the guess and your actual rating.
- **The model with the smallest average miss foretold your sessions best.**
  - Its bar is full and yellow; one twice as far off gets half a bar.
  - The number is the average miss in rating points.
  - A model is ranked once it was checked on 3 sessions (`TRUST.minSessions`).
- **The best one becomes the learning model** (`learningModel` in predict.ts, the owner's decision): once it was
  checked on 10+ sessions (`TRUST.switchAfter`) and beats the spot's current model by at least 0.1 rating points.
  Until then the spot learns from ECMWF (or its fallback). The section always says which model spotlog learns from
  there, so the switch is never silent. Conditions, tags and When to go then use that model too.

## Where this differs from the specification, and why

- **One-hour windows** (owner's decision, 0.16.2) instead of the spec's two-hour default, for finer times. A single
  good hour shows as a one-hour stretch.
- **The best-foretelling model becomes the learning model** after 10+ sessions (owner's decision, 0.16.2). The spec
  says one stable model; the switch is shown, never silent.
- **No per-day cap; each log is evidence** (owner's decision, 0.16.1). Sessions on one day can go differently, for
  example with the tide. The cap stays in config.ts, switched off.
- **A saved wind window counts as yours** (owner's decision, 0.16.1). There is no separate "confirmed" state, and
  learned windows are offered as suggestions instead.
- **The "Matters" column stays** (the owner's earlier decision). It's computed from your sessions but doesn't change
  the score.
- **Wave power's scale (10 kW/m)** isn't in the spec, so it's a starting value.
- **"Didn't go" days don't need a start time.** They're weak preference signals; without a time they use the session
  date and are marked limited.

## Known limits and things to calibrate

- **Distances are averaged over the whole feature set.** For windsurf (8 weights), a 6 m/s wind difference alone is a
  distance of only ~1. So outings in quite different wind still count as "similar", just with lower weight. Check
  `SCALE` and the core/extra weights against real diaries.
- **The thresholds are initial values:** `SIMILAR`, `GATES` and `TREES` in config.ts. Re-check them with walk-forward
  tests once real diaries are big enough.
- **No time-of-day learning:** spotlog finds good upcoming stretches but doesn't learn that you prefer mornings.
- **No decay:** old seasons count as much as new ones.
- **Equal-distance neighbors keep diary order:** only ten are used, so reordering equally similar outings can
  change a tag. A preference-change fixture reproduces Epic versus Not sure yet; see the session learning review.
- **Forecast quality limits everything:** if the forecast was wrong that day, the example is too.
