# Review checklist

Use this list when reviewing a change, whether it's your own before committing or someone else's PR. Every box is
something that has broken before.

## 1. Does it do what was asked, and nothing else?
- [ ] The change matches the request. Nothing was redesigned "while at it", especially on **desktop**.
- [ ] No owner decision from `docs/decisions.md` was undone (symbols, naming, per-sport tags, tide input…).

## 2. Data safety
- [ ] New stored fields are in `types.ts` **and** cleaned in `storage.ts → normalise()` with a safe default.
- [ ] Old diaries still load (scenario §2 passes). Legacy fields are still read where they're needed.
- [ ] Deletes go through tombstones; undo/upload uses `revived`. Nothing wipes the diary on its own.
- [ ] Values are stored in SI, and converted only for display.

## 3. Wording
- [ ] No hard-coded UI text. Every phrase is in `copy.ts`, and `check-words.py` is clean (missing, unused, duplicates).
- [ ] Dynamic keys are added to `check-words.py`.
- [ ] Tone: casual, plain, short. "spotlog" lowercase with the star (`{spotlog}`).
- [ ] Names match the metric (Wind direction, Temperature, Wave power…). No symbols that need a legend.

## 4. Layout
- [ ] Phones 320–430: nothing sticks out, and no number or tag is cut with "…" (scenarios §3 and §8 pass).
- [ ] The phone screenshots were actually looked at.
- [ ] 12-hour clocks, long spot names, bft/kt/ft/°F still fit.

## 5. Learning (when `predict.ts`, `wind.ts` or `forecast.ts` changed)
- [ ] `test-predict.mjs` passes. Changed expectations are explained in the commit.
- [ ] The rating stays "only good news" (`shownLevel`), and tags name the sport.
- [ ] Sessions outside the saved hours are still left out; the trusted model and bias still apply.
- [ ] `docs/learning.md` / `docs/forecast.md` are updated if the behaviour changed.

## 6. Code health
- [ ] `npm run lint`, svelte-check (0/0) and `npm run build` are clean.
- [ ] No `{@html}` with user text. User strings in map HTML go through `escapeHtml`.
- [ ] Windy calls fail quietly (a missing model, tide or summary never breaks a screen).
- [ ] No secrets anywhere. `WINDY_API_KEY` stays in GitHub secrets.

## 7. Shipping
- [ ] The version is bumped in `package.json` **and** `src/pluginConfig.ts`.
- [ ] `harness/sandbox.html` and `harness/stylelab/*` are rebuilt from this code.
- [ ] e2e (52 steps) and scenarios (`FINDINGS: []`) pass.
- [ ] The commit message says what changed for the user.
- [ ] Nothing was published to windy-plugins.com without the owner's explicit OK.
