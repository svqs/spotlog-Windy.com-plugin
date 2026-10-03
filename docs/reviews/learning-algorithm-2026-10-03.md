# Learning and recommendation algorithm review — 2026-10-03

This review uses the expected behavior supplied by the owner as its standard. It examines the current code, not the existing documentation. No application code was changed.

## Assessment against the five requirements

| Expected behavior | Current behavior | Assessment |
|---|---|---|
| 1. Save a forecast for the intended spot before going | A saved snapshot contains the spot, capture time, and roughly 24 hours of forecast values for available models (`src/plugin.svelte:2215-2229`; `src/lib/forecast.ts:283-339`). | **Mostly yes.** The log flow can also create a forecast automatically after the activity. Learning checks that a snapshot exists, but does not check that it was captured before the session (`src/plugin.svelte:2359-2379`; `src/lib/predict.ts:138-150`). A later forecast can therefore be treated as a prior prediction. |
| 2. Log time, rating, felt wind, gust type, and water | All five are saved (`src/plugin.svelte:2435-2452`). Rating is the learning outcome. Start and end locate one forecast value at the activity midpoint. Felt wind reduces sample weight when far from forecast and is used for model trust and wind bias. | **Partly.** Gust type (`Steady`/`Gusty`/`Very gusty`) and observed water (`Flat`/`Chop`/`Swell`/`Waves`) are stored but never used by `predict.ts` or `wind.ts`. The activity duration is not analyzed; one midpoint stands for the whole session. |
| 3. Recommend conditions per spot and sport once enough data exists | There is a separate model for each sport at each spot. Nearby spots within 3 km contribute same-sport samples at half weight (`src/plugin.svelte:1383-1389`; `src/lib/predict.ts:152-154,267-301`). | **Partly.** With a user-set wind window or adjusted range, a Good recommendation can appear with zero sessions. Without either, a learned range needs at least total weight 2 of rating-3+ sessions; that can be two local sessions or more down-weighted ones. There is no general minimum evidence or confidence gate before a positive recommendation (`src/lib/predict.ts:234-256,335-354`). |
| 4. Give the user's known workable conditions higher weight | The spot's wind range and directions seed the model. A manually adjusted range for a sport and parameter overrides the learned range entirely and has importance at least 0.8 (`src/lib/predict.ts:234-256,287-291`). | **Partly.** Explicitly adjusted ranges have strong priority. The basic wind window has only the default importance of 0.5 and is replaced after enough positive logs, so it does not consistently retain higher weight. There is no explicit distinction between a confident user judgment and a rough initial estimate. |
| 5. Learn optimal forecast ranges and the best time window | Ranges come from successful sessions' saved forecast values; poor sessions adjust parameter importance. Today's and the next days' hourly forecasts are scanned for daylight stretches with a Good-or-better guess (`src/lib/predict.ts:267-321,375-424`). | **Partly.** This finds plausible forecast ranges and upcoming hours. It does not optimize a range against both successes and failures, nor learn that a particular clock-time or session duration works best. It selects the qualifying stretch with the highest **average** rating, with no minimum duration. |

## How the current algorithm actually works

1. **Make examples.** Only a session linked to a spot and a saved snapshot can teach the main model. The code chooses the session midpoint, reads the nearest hour of the saved forecast, and excludes times outside the saved series by more than one hour. It uses the spot's currently trusted wind model, falling back to ECMWF or another saved model (`src/lib/predict.ts:97-150`).
2. **Weight examples.** A sample normally has weight 1. It gets weight 0.5 when felt wind differs from forecast wind by more than one third, and nearby-spot samples get another factor of 0.5. A rating-2 “didn't go” entry is a poor example. Ratings 4–5 are the preferred successful examples; ratings 3–5 are used if there is less than weight 2 of ratings 4–5 (`src/lib/predict.ts:138-150,267-272`).
3. **Build one range per parameter.** The order is: manually adjusted range; a range around successful forecast values; the spot's initial wind range/directions; or no range. Linear ranges use min–max, or approximately the 10th–90th percentile from six examples onward, then widen. Directions use a 20° band around each successful direction (`src/lib/predict.ts:234-256`). The percentiles themselves do **not** use sample weights; weights only decide whether there is enough data to create the range.
4. **Set importance and rate conditions.** Each parameter starts at importance 0.5 (main) or 0.25 (extra). Poor examples outside a range can raise its importance; poor examples inside can lower it. Today’s conditions get a 0–1 fit for each available parameter. A weighted average of fits is reduced further for any parameter with zero fit. The resulting score is scaled by the average rating of past *fitting* sessions, mixed with a prior rating of 3.4 counted as two sessions (`src/lib/predict.ts:267-321`). A calculated rating of at least 2.7 becomes Good, 3.5 Great, and 4.2 Epic (`:335-354`).
5. **Find a time to go.** For each sport, the code groups daylight forecast hours whose individual guess is Good or better. It returns the group with the highest mean rating for today or each future day (`src/lib/predict.ts:375-424`). This is a search over upcoming weather, not learning a preferred time of day from session history.

## Material gaps and risks

### 1. The training forecast may have been saved after the activity

`captureForLog()` can create and attach a forecast while the user logs a session (`src/plugin.svelte:2359-2379`). `samplesFor()` only checks the link and time coverage, not `snapshot.savedAt <= session.date` (`src/lib/predict.ts:138-150`). For today's past activity, the code may learn from a revised forecast. **Recommendation:** record and enforce forecast lead time. Keep later captures visible in the diary, but exclude them from claims about what the earlier forecast predicted. Decide how to handle forecasts captured during an activity.

### 2. Observed gust and water conditions do not teach the recommendation

The forecast's numeric gust speed and wave height can become learned parameters, but the user's `gusts` and `water` selections never enter a sample (`src/lib/predict.ts:87-95,138-150`). This loses direct evidence of what was actually experienced. **Recommendation:** first decide their meaning: use them to assess forecast accuracy, to explain why a rating differed from the forecast, or as separate preference signals. Do not treat the words as exact replacements for m/s gust and metre wave values.

### 3. Model trust can be wrong for multiple sessions using one saved day

Saving a session changes the snapshot's focus values to that session's time (`src/plugin.svelte:2460-2469`). Yet `modelScores()` and `forecastBias()` compare every linked session with those single focus values (`src/lib/wind.ts:124-164`). A reproduced two-session example scored one model as an average miss of 0 and the other as 10 m/s, even though both actually missed by 5 m/s on average at their respective hours. This distorts the model used for learning and the felt-wind adjustment. **Recommendation:** compute both comparisons from each model's saved series at each session's own time, and use focus values only for old snapshots without a series.

### 4. Forecast-prefilled felt wind is counted as an observation

The felt ruler starts at the forecast value when a snapshot is attached, and that value is saved even if the user does not adjust it (`src/plugin.svelte:2351-2354,2377-2379,2444-2448`). The model ranking then counts it as real felt wind. This can make the initially chosen model appear artificially accurate. **Recommendation:** keep an explicit “felt value supplied by user” flag or leave the observation unset until the user interacts, while still showing the forecast reference.

### 5. “Enough data” and poor evidence are not handled consistently

The initial wind window can yield Good with no sessions. In a reproduced case, one rating-2 example at conditions inside that window still yielded a calculated 2.93, shown as Good; two yielded 2.7, also Good. The positive prior outweighs those poor observations (`src/lib/predict.ts:174-180,294-296,353-354`). An unknown-window spot, by contrast, may stay silent until two positive samples. **Recommendation:** distinguish an explicit user-known window from a tentative window and a statistically learned recommendation. Set an evidence gate or conservative prior for learned tags, and test poor-only and mixed-history cases.

### 6. Ranges and time windows are simple heuristics, not an optimum

The range boundaries use positive observations alone; failures only change importance, not where the range begins or ends (`src/lib/predict.ts:242-251,277-291`). Two separated successful condition clusters may become one broad range with untested conditions between them. Sample weights do not affect the quantiles. `bestIn()` has no minimum useful duration, favors highest mean rating over a longer almost-as-good interval, and does not split a run at missing hours (`src/lib/predict.ts:375-399`). In a reproduced hourly case with data at 10:00, 11:00, and 14:00, it reported one 10:00–15:00 window. **Recommendation:** learn candidate ranges using weighted successes *and* failures, validate on past sessions, and score future windows with minimum duration, coverage, and gap checks. If “best time window” means a recurring time of day, model that separately from forecast quality.

### 7. Missing sport-specific forecast data can still yield a positive tag

`scoreOf()` skips a parameter when today's value is absent and renormalizes over what remains (`src/lib/predict.ts:305-321`). In a reproduced example, a new Surf spot with a W wind window returned Good with no swell or wave forecast at all: only wind and wind direction were scored. **Recommendation:** define required forecast fields per sport, or at least require a minimum share of important parameters and report “not sure yet” when they are missing.

## Opinion and suggested direction

The current range-and-fit method is a reasonable transparent baseline for a small personal diary. Its strongest feature is that each recommendation can point to understandable forecast conditions. I would keep that explainability, but treat provenance and evidence as first-class inputs: **forecast captured before activity**, **user-observed versus forecast-filled values**, **explicit user knowledge versus inferred range**, and **amount of supporting history**. Fix the time-alignment and observation issues before tuning weights or adding a more complex model. Then define what “enough data” and a useful outing duration mean for each sport, and test recommendations against held-out past sessions rather than only examples used to form the ranges.

## Verification

Read-only code tracing plus `node scripts/test-predict.mjs` (12 checks passed). Direct calls to the compiled modules reproduced the poor-only Good result, the shared-snapshot model-score error, the window that spans missing forecast hours, and the Surf tag without wave data. No UI or real-Windy tests were run; this review changes only this Markdown file.
