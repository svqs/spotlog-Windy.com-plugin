# Recommendation v2 — implementation specification

Status: proposed, 2026-10-03. Scope: replace the current guess and best-window scoring, add a larger-data boosted-tree path, and simplify the session form. This document specifies behavior; it does not change the plugin.

## Product contract

- Recommend **per spot and sport** from the forecast that was available before an outing and the user's 1–5 rating of that outing. Lower ratings are training evidence, not discarded.
- Use **weighted similar sessions** for every spot and sport by default. Use boosted trees only when the same spot and sport has sufficient varied data and the tree demonstrably improves predictions on later sessions.
- Keep user-confirmed workable conditions as a strong starting preference. Let repeated real outcomes revise that preference. A preset or unconfirmed wind window must not masquerade as confirmed knowledge.
- Show only Good, Great, Epic, or Not sure yet. A high score alone is insufficient when evidence or essential forecast fields are missing. Continue naming the sport in the tag.
- Find useful **upcoming forecast stretches**. Do not claim to have learned a preferred clock time until a separate time-of-day model exists.
- Train and infer locally in the browser. No cross-user training or new server is part of this change.

## Session form and stored data

1. Remove the **felt wind ruler**, **gust type chips**, and **water condition chips** from new/edit session forms. Keep sport, date, start/end time, rating, gear, notes, and optional track.
2. Retain `Session.felt`, `gusts`, and `water` in `types.ts` and `storage.ts` as validated legacy fields. Display their old values read-only where relevant; never clear them while editing or importing an old session. New sessions save these fields as `null`. This is a data-preservation change, not a destructive migration.
3. Stop using felt wind for sample weighting, forecast bias, and automatic model ranking. Remove or replace dependent copy and UI: “It felt like”, “Closest”, forecast-bias stat, and “Which forecast to trust”. The forecast card may still show numeric forecast gusts and waves; those are forecast features, not session inputs.
4. A model picker may remain for viewing forecasts. It must not silently change the model used for training or recommendations. Use ECMWF consistently where available. If it is unavailable at a spot, select one covering fallback model once and persist that choice as `Spot.recommendationModel`; validate it in `normalise()`. A snapshot lacking that model cannot train this spot. If the selected model has no current forecast, show Not sure yet.
5. Add `Spot.windowConfirmed?: boolean`, validated in `normalise()`. Set it when the user explicitly changes the default wind range/directions or confirms them through a dedicated action; merely accepting the prefilled defaults leaves it false. “I don't know yet” also leaves it false. Old spots default to false until confirmed, but their numeric ranges and any `spot.ranges` remain intact. An explicit per-sport `spot.ranges` entry already counts as confirmed. Phrase the wind inputs as **forecast wind**, since felt-wind bias will no longer convert them.

## One training example

Build one example per **actual outing**, keyed by session ID, spot ID, and sport. This single extraction path feeds both models, descriptive ranges, and offline evaluation.

An example is eligible when its rating is 1–5, its spot and sport are known, and its linked snapshot covers the activity and was captured **no later than the activity start** (`snapshot.savedAt > 0 && snapshot.savedAt <= start`). Verify that the snapshot belongs to the spot or its coordinates are within 1 km. An automatically captured forecast saved after the activity, or a legacy snapshot without a credible capture time, stays in the diary but is excluded from training. Never use a later forecast to reconstruct what the user could have known beforehand.

For new sessions, require a start time and encourage an end time. Use `session.date` as the UTC start instant and resolve the stored end clock with the session's `tz` where available, including overnight and daylight-saving changes. With both times, summarize the saved forecast over the outing: median wind and waves/swell, maximum gust, circular mean direction, median period and temperature, and maximum hourly rain. With start only, use the nearest forecast hour and mark coverage as limited. Old sessions without a start can use `session.date` if a pre-activity snapshot covers it; mark them limited too. Exclude examples whose required sport fields are missing or whose forecast has a gap greater than 1.5 hours within the recorded outing. Use the **same summary function** on candidate future windows.

Minimum required features: wind and wind direction for Windsurf/Kite/Wing/Other; swell height and period plus wind for Surf. Optional forecast gusts, waves, swell direction, temperature, rain, and wave power can improve similarity when present. Missing optional fields must not make an example look closer by shrinking the distance denominator; missing required fields yield Not sure yet. Store feature availability and provenance in the derived example, not as new diary data.

The existing `checked` (“didn't go”) record is a preference judgment, not an observed outing rating. Keep it distinct: it may contribute a weak negative preference (initial weight 0.25) to the similar-sessions model, but it does not count toward the minimum actual-outing evidence or boosted-tree eligibility. Keep actual poor outings at full weight.

## Default model: weighted similar sessions

For a candidate forecast window `x`, compare its sport-specific feature vector with eligible past examples for that spot and sport. Normalize each feature with a fixed, versioned scale in SI units. Initial scales to validate: wind/gust 3 m/s, waves/swell 0.75 m, period 3 s, temperature 8 °C, rain 2 mm, directions 45°. Direction difference is the shortest angle around the compass. Give core sport features weight 2 and optional features weight 1; put these settings in one configuration object.

Calculate `distance² = sum(featureWeight × normalizedDifference²) / sum(featureWeight)` over the fixed applicable feature set, with `normalizedDifference = difference/scale` when both values exist and `1` when either optional value is missing. Compare only examples with all required fields. Use the closest 10 examples within distance 2, with `similarity = exp(-distance² / 2)`. Local actual outings have base weight 1; same-sport outings at spots within 3 km may contribute at base weight 0.25, capped at total weight 2, and never satisfy the local evidence minimum. Cap the combined weight of sessions from the same spot, sport, and calendar day at 1 so repeated logs of one weather day do not dominate. Historic dates do not automatically decay in v2.

Compute the weighted mean rating of these examples. Blend in a user-preference prior: calculate each specified parameter's 0–1 range fit, use the **lowest** fit as `userFit`, and set `priorRating = 1 + 2.4 × userFit`. A confirmed wind window/per-sport range contributes this prior with weight 2; an unconfirmed preset window contributes weight 0.5; an unknown window contributes none. Explicit per-sport ranges take precedence over the general wind window for that parameter. The combined score is `(sum(exampleWeight × rating) + priorWeight × priorRating) / (sum(exampleWeight) + priorWeight)`; if the denominator is zero, return Not sure yet. Do not turn the prior into synthetic outing records.

Compute effective observed support `N_eff = (sum weights)² / sum(weights²)` from **actual local outings** only. For a learned Good tag, require `N_eff >= 3`, at least one local rating >= 3 among similar examples, and a close local example (distance <= 1). Confirmed user ranges may produce a Good suggestion with no outings, clearly described as coming from the user's range. Never emit Good from a neighborhood whose only local actual outcomes are ratings 1–2. Great requires at least three local ratings >= 4 in the neighborhood; Epic requires at least six local ratings >= 4, including two 5s. Use the existing numeric display cutoffs (2.7/3.5/4.2) after these evidence gates; otherwise show Not sure yet. These are initial constants to check with walk-forward tests, not claims about statistical confidence.

Keep a structured result: score, display level, sport, source (`user range` / `similar sessions` / `boosted trees`), actual local support, effective support, nearest distance, and reasons for Not sure yet. Do not present a model score as a calibrated probability.

### Descriptive ranges

For “What works here”, show weighted 10th–90th percentile ranges of well-rated **actual local outings** when enough exist, and distinguish them from manually set ranges. These describe observed successful forecasts; do not call them mathematically optimal. Keep separate clusters separate when a single continuous range would include a strongly unsuccessful middle. Poor outings influence predictions through their ratings, not merely a parameter-importance score.

## Larger-data model: boosted trees

Train a small **gradient-boosted regression-tree** model on the same forecast features and 1–5 ratings, per spot and sport. It is a candidate only with at least 100 eligible actual local outings across at least 30 distinct days, including at least 20 ratings <= 2 and 20 ratings >= 3. These initial gates must be configurable and reassessed against real diary sizes. Nearby spots and `checked` records do not count toward eligibility.

Initial limits: depth <= 2, at least 10 training examples per leaf, learning rate <= 0.05, and at most 100 trees. Encode directions as sine/cosine; impute optional missing features using training-fold values and include missingness indicators. Use a deterministic seed and local training. Choose a browser-compatible implementation during development after checking bundle size and phone performance; the specification does not require a particular library.

Evaluate by **chronological, day-grouped walk-forward splits**: each validation outing must occur after all training outings, and sessions on one day stay in one group. The tree activates only if its mean absolute rating error improves by at least 5% over weighted similar sessions on at least 20 held-out outings **and** its rate of false Good tags on ratings 1–2 is no worse. Then retrain on all eligible history. Otherwise use weighted similar sessions. If either model lacks required current forecast fields or the candidate is outside observed feature coverage, return Not sure yet rather than extrapolating.

When active, blend 70% tree score and 30% similar-sessions score; use a 50/50 blend when the user has a confirmed range, so user knowledge retains higher influence. Apply the same evidence gates and window rules to both paths. Tree training runs only after diary/model-input changes, is cached by spot/sport and algorithm version, and must not block the UI. A failed or unavailable tree implementation falls back to weighted similar sessions without changing diary data.

The model and validation choices follow the principles of [distance-weighted neighbors](https://scikit-learn.org/stable/modules/neighbors.html), [controlled tree complexity](https://scikit-learn.org/stable/modules/ensemble.html), and [time-ordered evaluation](https://scikit-learn.org/stable/modules/cross_validation.html). These are design references; the plugin remains TypeScript and browser-based.

## Forecast windows and display

- Score rolling **two-hour** windows (initial default) from contiguous daylight forecast hours for each sport. A missing hour splits a run. Require every hour and the aggregate window to pass the same required-feature and evidence gates.
- A candidate window is Good or better only if its aggregate score passes the display cutoff. Merge adjacent qualifying windows for the same sport. Choose the highest mean rating; when means differ by <= 0.2, prefer the longer window, then the earlier one. Never bridge an unforecast gap or imply a one-hour sample supports a multi-hour outing.
- Display the best stretch today and matching future days as before. A sport with no eligible window shows Not sure yet; it must not become Good merely because another sport matches. Predictability, where available, remains a separate forecast-uncertainty signal and does not alter the personal suitability score.

## Carry-forward risks from [the learning algorithm review](../reviews/learning-algorithm-2026-10-03.md)

| Earlier finding | Required handling in this change |
|---|---|
| Forecast captured after an activity | Enforce capture-before-start eligibility; preserve late snapshots in the diary. |
| Observed gust/water fields unused | Remove inputs; keep historical fields, while **forecast** gust/wave values may remain model features. |
| Incorrect trust/bias with shared snapshots | Retire felt-based trust and bias; choose one stable model per spot. Use each session's own saved series time in feature extraction. |
| Forecast-prefilled felt counted as real | Remove ruler and all felt-derived training paths; retain old stored values only. |
| Sparse or poor-only examples yielding Good | Enforce local evidence and poor-only gates; label confirmed-range suggestions clearly. |
| Blunt ranges and broken best windows | Use similarity with both positive and negative ratings; descriptive ranges; contiguous minimum-duration windows. |
| Surf tag without swell data | Require sport-specific forecast fields before scoring. |

## Implementation sequence and acceptance

1. Add a pure, tested example extractor and forecast-window summarizer. Add the new spot fields to `types.ts` and `storage.ts → normalise()`. Preserve old sessions and snapshots. Test pre-/post-activity capture, shared saved day, overnight and daylight-saving sessions, missing hours, missing Surf data, and old single-hour snapshots.
2. Implement the weighted similar-sessions scorer and structured result in `src/lib/predict.ts` or a new focused module. Replace the old score path in `plugin.svelte`; keep manual range editing and per-sport behavior. Test no history, confirmed range, poor-only, mixed outcomes, nearby spots, opposite/wraparound directions, missing optional data, and unit invariance.
3. Remove the three session inputs and felt-based trust/bias UI and logic. Update `copy.ts`, old-diary normalisation, e2e, scenarios, Style Lab fixtures, and documentation. Existing values must survive load, edit, import, export, and sync unchanged.
4. Implement boosted-tree training behind the data and walk-forward performance gates. Assert deterministic training, fallback on errors or insufficient data, correct model selection after a diary change, and acceptable phone responsiveness.
5. Replace best-window selection with contiguous two-hour windows. Add tests for isolated one-hour matches, forecast gaps, day boundaries, multiple sports, and preference for a longer near-equal window.
6. Run the repository's build, lint, words, learning checks, type check, e2e, and scenario suite; inspect phone screenshots. Update `docs/learning.md`, `docs/forecast.md`, `docs/data-model.md`, `docs/decisions.md`, and user-facing wording to match the delivered behavior. Bump both versions and rebuild harness pages before shipping. Publishing still requires the owner's explicit request.

Acceptance condition: an old diary loads without losing any session field; a user can log an outing with time and rating alone; a post-activity forecast never becomes a training example; poor actual outings can suppress a previously positive guess; a new Surf spot without swell data stays Not sure yet; recommendations use similar sessions by default; boosted trees activate only after the stated eligibility and held-out improvement checks; and every displayed time window is supported by contiguous forecast coverage.
