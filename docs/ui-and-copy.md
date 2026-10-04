# UI, wording and design (copy.ts, theme.ts, the Style Lab)

## Wording: src/lib/copy.ts

- **Every phrase is in `COPY_GROUPS`,** grouped by screen. Each item is `[key, text, note?]`. The Style Lab's Words
  editor shows the same groups.
- **In code:**
  - `W.key` in Svelte markup (reactive, includes Style Lab overrides);
  - `w('key')` in plain TS;
  - `fill(text, {vars})` fills in `{placeholders}`;
  - `rich(text)` renders `**bold**` and the brand: `{spotlog}` (lowercase, pixel star) or `{Spotlog}` (sentence start).
    Use `{@html rich(...)}` only with copy text, never with user input.
- **Dynamic keys** are built in code, for example `'guess' + level`, `'guessFor' + level`, `'matter' + level`,
  `'sport' + name`, `'param' + Key` and `'tide' + state`. When you add one, also add it to the lists in
  `scripts/check-words.py`.
- `python3 scripts/check-words.py` fails for missing, duplicated or unused phrases. Its coverage includes
  static calls, declared dynamic families, accessibility labels, gear hints and structured GPX errors; it is a
  source-use check, not a general detector of every hard-coded string.

## Writing for spotlog

- Casual, friendly, short. Talk to "you". Sentences, not labels with colons.
- The name is **spotlog** (lowercase + pixel star) in text. The wordmark is **SPOTLOG**.
- **Naming matches the metric**, everywhere: Wind, Wind direction, Gusts, Waves, Swell, Swell direction, Swell period,
  Wave power, Temperature, Rain. The forecast card and map card tiles say "Direction".
- **No symbols that need explaining.** Use words ("a little / some / a lot") or self-explaining colour (green = fits
  your range).
- **Ratings are per sport:** "Good / Great / Epic for {sport}". Below "good", show "Not sure yet". When nothing is known,
  say so and say what helps ("Not sure yet. Adjust your window or log a few sessions here…"). Don't fill the gap with a
  source line like "from your wind window".
- Explanations under tables explain each column in one short sentence.

## Look: src/lib/theme.ts

- **`THEME`** holds every colour, radius, size and map-mark setting. The keys are the Style Lab's tokens, one to one.
- **`themeCss()`** turns them into CSS variables (`--sl-<token>`, px for sizes). Components use
  `var(--sl-x, <fallback>)`. LESS shorthands at the top of the `<style>` block (`@text`, `@sub`, `@line`…) map to them.
- **Rating colours:** `r1…r5` are used for sessions. The guess colours `g1…g5` follow them when `guessLinked`. A spot
  lights up from `lightFrom` (3 = good).
- **Dark background:** keep it. Don't restyle desktop unless asked.

## The Style Lab (Sophia's design tool)

- **Pages:** `harness/stylelab/index.html` is the editor and `preview.html` is the real spotlog with fake Windy and
  example data. They're built by `node scripts/build-lab.mjs` and published as a claude.ai artifact.
- **Saving:** the lab saves to its artifact database, document `design/current`:
  `{ tokens: {...all current tokens}, words: {...changed only}, savedAt }`.

**Applying a saved design**
1. Read `design/current` from the lab's database.
2. Diff it against the defaults:
   `cp src/lib/design.ts /tmp/d.bak && node scripts/apply-design.mjs saved.json && cat src/lib/design.ts && cp /tmp/d.bak src/lib/design.ts`
3. **Fold the differences into the source:** tokens into `theme.ts` defaults, words into `copy.ts`. Keep `design.ts` empty.
   That way the code stays the single source of truth.
4. Clean obvious slips (typos, double spaces, trailing spaces) and mention them to Sophia.
5. If her saved words contain a slip, also write the corrected words back to the lab's database. Otherwise the lab shows
   the old text and the next apply brings it back.
6. An **empty phrase** means "hide this line". Make the template skip it (`{#if W.key}`).
7. Rebuild, run the checks, then republish the sandbox and the Style Lab.

## Layout rules

- **Phones** (320–430 px wide) are first-class. Nothing may stick out, and no value or tag may be cut with "…". Long
  names and notes may ellipsize, numbers may not. Values wrap whole (`white-space: nowrap` per value, wrapping between
  values).
- **Tiles:** wind number + unit + direction on one row, gusts and waves underneath (they wrap on narrow tiles), then the
  tag ("Great for windsurf") with the time of a later best window next to it.
- **What works here:** the table has Your range · Matters · Today. Matters sits right after the range (no big gap).
  Today is green when it fits your range and orange when close.
- **Phone screens:** `harness/scenarios.py` section 8 takes screenshots of every screen at 320/360/390/430. Look at them
  after UI changes.


0.18 keeps stable English gear-kind identifiers in saved diaries and resolves their labels/hints through copy.
Custom/existing unknown kinds display their saved value. GPX readers throw structured errors; the UI maps their
keys through copy. SnapCard and Leaflet share `forecast-display.ts`, so unit conversion/rounding stays consistent.
The live preview bridge is installed and removed separately from production lifecycle; it never writes the diary.
