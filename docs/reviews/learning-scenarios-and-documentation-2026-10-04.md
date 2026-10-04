# Session learning tests and documentation review — 2026-10-04

Reviewed `1cfc619` (0.18.1). This follow-up adds tests in 0.18.2; recommendation rules and the UI are unchanged.
All diaries below are synthetic. No real diary, Windy publication or external service was changed.

## Why four logged sessions can show three learned sessions

**Four eligible outings, including two rated 4–5, correctly count as 4 sessions, 2 great.**
The number under each sport in “What works here” counts eligible actual outings for that spot and sport,
not every entry in the diary. “Great” includes both ratings 4 and 5. The count is not limited to ten neighbors;
the prediction itself is. A learned Great tag additionally needs three similar local outings rated 4+.

The tests reproduce **4 stored, 3 learned, 1 great** when one of the two great outings cannot teach.
The late-forecast fixture reproduces the displayed text on desktop and phone, before and after reload.
Other reproducible causes are an unlinked/missing forecast, uncovered hours, a forecast gap, the wrong place,
a missing selected model or core feature, malformed imported forecast data, or a session at another spot/sport.
“Didn't go” entries contribute a weak preference but do not count as outings or great outings.

**A concrete flow deserves attention:** the spot page's “Log session” action looks for an **unused** forecast
(`plugin.svelte → pendingFor/startLog`). After the first log uses a saved forecast, that action captures a new one
instead of reusing the original, even if it covers the second outing. Logging a session that started before the
new capture excludes it from learning. The browser test starts with three outings/one great on a shared saved day,
then logs an epic outing at 10:00–11:00 with the browser clock at noon. It stores all four but still shows 3/1.
The form's late-forecast warning is visible. “Your last saved forecast” explicitly reuses the original and counts
four eligible form saves correctly. This is a plausible explanation for the reported observation, not proof of
what happened in the owner's diary.

Suggested follow-up: let the spot's log action reuse an appropriate pre-start saved forecast when it covers the
outing, and explain excluded logs/counts clearly. Keep the save-before-start rule; do not count late captures to
make the total match. Choose the snapshot using session coverage and capture time, not just its focus timestamp.

## Results

**46 Node scenarios pass.** They run JSON input through `normalise()`, the application's learning controller,
and direct extraction; cached and uncached results must agree. One scenario contains fourteen sequential
save/edit/delete/undo/reload/import/merge checkpoints. Two additional assertions verify notes-only cache reuse.

| Scenario | Observed result |
|---|---|
| Four outings sharing a saved day, ratings 3/4/3/5 | 4 learned, 2 great; each outing counts separately |
| Capture exactly at the first start / unknown capture timestamp | 4/2 / 0/0; unknown capture times cannot teach |
| Nine variants excluding one great outing | 3/1; exact skip reason asserted for each |
| Four logs split between Windsurf and Wing | Windsurf 3/1; Wing 1/1 |
| Four logs split between distant spots | Original spot 3/1; other spot 1/1 |
| Unlinked outing / one “didn't go” entry | 3/1; all four entries remain stored |
| Start-only / overnight / Prague autumn DST / legacy single-hour save | Eligible; limited coverage marked where appropriate; DST outing spans four real hours |
| Four poor / mixed with two great / four great / six great with two epic | Not sure yet / Good / Great / Epic for matching conditions |
| No history, no window / saved user window | Not sure yet / Good from user range |
| Eight nearby outings, no local outings | Local count/evidence remain zero; no learned local tag |
| Surf with waves / without waves; custom Sailing sport | Independent counts; missing Surf core data never teaches |
| Sequential saves 1 → 4 | Counts 1/0 → 2/1 → 3/1 → 4/2 |
| Rating edit / delete / undo / unlink / relink / capture-time edit | Counts update immediately; controller matches direct calculation |
| Reload / reimport same backup / identical two-tab merge | Counts and entries preserved without duplicate logs |
| Better-model switch with one ECMWF-only historical save | GFS selected; 11/6 instead of base-model 12/6; missing-model reason verified |
| Eight logs before model switch threshold | ECMWF retained, 8/4 |
| Seven / eight well-rated uses of one sail | No gear hint / hint based on eight outings |
| 99 / 100 / 300 / 600 mixed outings on separate days | Counts 99/49, 100/50, 300/150, 600/300; trees eligible from 100 but rejected when neighbors already solve the data |
| 120 all-epic outings / 120 outings on only 20 days | No trees: insufficient poor outcomes / insufficient distinct days |
| 120 logs including 60 “didn't go” | 60 learned, 60 great; checked logs never satisfy tree eligibility |
| 600 outings over 600 days, two spots and three sports | 150 per spot/sport group; great counts 0/150/0/150 with no cross-group inflation |
| 120 varied outings with a saved user window | Trees accepted: 48 later outings held out; mean absolute error 0.01184 vs 0.13333 for similar sessions |
| Activated trees, forecast beyond coverage / edited historical rating | No tag beyond coverage / cached trees invalidated |
| Preference change: 60 old epic, then 60 recent poor at identical conditions | Summary 120/60; recommendation depends on entry order (finding below) |

**Eight browser scenarios pass:** valid, late, and 600-session diaries at desktop 1440 px and phone 390 px
(each checked again after reload), four actual form saves, and the spot-action recapture flow. Stored totals and
visible learning counts are asserted, with no page errors. Screenshots include the late warning and the 3/1 result.

## Separate long-term finding: equal-distance ordering

`learn/similar.ts → neighbours()` sorts by distance alone, then keeps ten examples. Equal-distance examples
retain diary order. In the 120-outing preference-change fixture, oldest-first order selects ten old epic outings:
score **5, Epic**. Reversing precisely the same records selects ten recent poor outings: score **1, Not sure yet**.
Both orders correctly report **120 sessions, 60 great** in the summary.

This is reproduced with the similar-session scorer before optional tree activation. It is independent of the
four-session count issue. Existing tests now explicitly characterize it so the limitation remains visible; their
passing does **not** mean this behavior is desirable. Trees cannot be relied on to fix it for every diary.

Suggested follow-up: define an order-independent policy for equally similar neighbors, then test reordered
imports and changed preferences. A recency preference would be a separate product decision; current learning
has no age decay. Neither threshold tuning nor that policy was changed in this test/review task.

## Make the documentation smaller

The `docs/` Markdown inventory before this report is **1,788 lines across 18 files** (plus the outdated spreadsheet
and performance JSON). The nine current topic guides have distinct responsibilities. Most avoidable bulk is
completed specifications and historical reviews, plus repeated rules/commands across entry points.

Recommended working set: a short user `README`, `AGENTS`, the `docs/README` index, and six focused guides:
architecture; data; learning; forecasts; UI/copy; testing/operations. Keep this report as requested evidence.

| Document | Recommendation and what must survive |
|---|---|
| `docs/rating-logic.xlsx` | Remove from the working tree: obsolete 0.13 logic; `learning.md` is authoritative. Git retains history. |
| `docs/reviews/learning-algorithm-2026-10-03.md` | Remove/archive: pre-v2 findings refer to retired behavior. Carry any still-open limits into the current learning guide. |
| `docs/specifications/recommendation-v2-spec.md` | Remove/archive: shipped in 0.16 and contradicted by later owner decisions. Keep current rules in `learning.md` and owner rationale in the rules entry point. |
| `docs/specifications/code-optimization-spec.md` | Remove/archive: completed handoff. Keep current module contracts and unresolved costs in architecture/testing. |
| `docs/reviews/code-structure-2026-10-04.md` | Remove/archive after copying remaining open issues to one short backlog. This reviews 0.17, before the fixes. |
| `docs/specifications/diary-conflict-migration-spec.md` | Merge local revision/legacy guarantees into `data-model.md`; retain a short disabled-sync protocol note. Remove the old Supabase SQL rollout instructions. |
| `docs/reviews/code-optimization-implementation-2026-10-04.md` and its performance JSON | Archive as evidence, outside the main reading path. Retain links only where measured performance is discussed; do not lose unresolved host/storage limits. |
| `docs/decisions.md` | Condense owner decisions into a single rules section in `AGENTS.md`, with a learning-guide link. Keep the owner's rationale and explicit publication restriction. |
| `docs/review-checklist.md` | Merge unique acceptance requirements into testing; most boxes repeat `AGENTS` and topic guides. |
| `docs/testing.md` + `docs/operations.md` | Merge into one concise workflow guide: setup, commands, screenshots, build/version, manual publish, real-Windy limits. Keep service security/deployment details close to the service. |
| `README.md` | Shorten to purpose, quick start, browser-only backup warning and docs link. Fix Node 18/`npm install` to Node 20+/`npm ci`; remove the claim that a diary appears on another device automatically. Publish/setup details should have one home. |
| `DEVELOPER.md` / `DESIGN.md` | Optional redirects; remove once inbound links are updated. Keep `CLAUDE.md`'s one-line agent entry redirect. |
| `tide-worker/README.md` | Keep: it is the only operational guide for that optional service. |
| Review/specification indexes | Reduce after consolidation. Keep a short index for retained evidence and genuinely unimplemented proposals. |

Removing the outdated learning review, completed recommendation/optimization specs and superseded structure review
alone removes **606 Markdown lines**, before the proposed guide merges. Do not delete current data compatibility,
owner decisions, experimental Windy limitations, font licences, test fixtures or generated sandbox/Style Lab pages.
Update inbound links in the same cleanup commit. This task suggests removals; no historical documents were deleted.

Specific misleading leftovers: `decisions.md` says `spot.startOwn` stays while `data-model.md` documents its removal;
the implementation report still includes removed Supabase/Deno acceptance/deployment steps; and the testing guide
repeats two command catalogs. Resolve these when condensing rather than copying them forward.

## Reproduce and validation

```sh
npm ci
npm run test:learning                      # 46 scenarios; JSON evidence + browser fixtures in /tmp/spotlog-learning
npm run build
npm run rebuild:harness
# Start python3 -m http.server 8765 from the repository root.
python3 -m venv /tmp/spotlog-tests
/tmp/spotlog-tests/bin/pip install -r harness/requirements.txt
/tmp/spotlog-tests/bin/python -m playwright install chromium
/tmp/spotlog-tests/bin/python harness/learning_scenarios.py
```

Node outputs `/tmp/spotlog-learning/results.json`; browser evidence and screenshots go to
`/tmp/spotlog-learning-browser/`. Both paths can be overridden with script arguments. Browser fixtures are generated
by the Node suite, so run it first. The tests are included in `check:fast` and `check:browser` for future CI runs.

Environment: macOS arm64, Node 26.10.0, Python 3.9.6, Playwright 1.60.0 / Chromium 148.0.7778.96.
The old `playwright==1.63.0` pin was unavailable from the configured package index; the requirement now pins the
available tested 1.60.0. Locked npm dependencies were installed before the final checks.

Validation: locked install, build, rebuilt sandbox/Style Lab, lint, 449 copy phrases, matching versions,
Svelte/TypeScript (0 errors, 0 warnings), core checks, 16 existing learning groups, 46 new scenarios, tide-worker
HTTP/KV tests and its type check all pass. Browser checks pass: 50 end-to-end steps (zero errors), existing
scenarios (`FINDINGS: []`), six focused regressions and eight new learning cases. Phone screenshots were inspected.
The older browser suites ran against the 0.18.1 bundle; the eight new learning cases also pass against the final
0.18.2 build. The application change between these bundles is only the displayed release version.
Synthetic forecasts establish calculation/flow behavior, not real-world recommendation accuracy or real Windy API
coverage. No conclusion about the owner's exact excluded session can be drawn without its saved diary details.
