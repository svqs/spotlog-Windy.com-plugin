# Product decisions

These are decisions the owner made, newest first. They exist so nobody "simplifies" a choice back. To change one, ask
the owner, then update this page.

## Rating and learning

| Decision | Why | Since |
|---|---|---|
| **Recommendation v2** ([spec](specifications/recommendation-v2-spec.md)): weighted similar sessions per spot and sport; boosted trees only with lots of data and after beating similar sessions on later outings | Poor outings count through their ratings; evidence before tags; a path to a stronger model | 0.16 |
| **Only a forecast saved before the outing teaches**; later ones stay in the diary | Learn from what you could have known | 0.16 |
| **Your wind window counts as yours only once you change or confirm it** ("I'm sure" / "It's right"); a preset one counts less and never gives a tag alone | A preset mustn't pass for knowledge | 0.16 |
| **One model per spot** (ECMWF; one fallback chosen once where ECMWF has no forecast); no felt-based "which forecast to trust" and no bias | Felt wind was often prefilled; shared saved days skewed it | 0.16 |
| **Session form without felt wind, gusts and water**; old values kept and shown read-only; a start time is needed for new outings | Those inputs didn't teach; time finds the forecast | 0.16 |
| **Only good news:** good / great / epic, else "Not sure yet" (with the reason as a tooltip) | A wrong negative guess makes people skip good days | 0.12 |
| **Tags name the sport:** "Good / Great / Epic for windsurf" | Ratings are per sport | 0.15 |
| **"Not worth it, didn't go"** is an option in Log session (rating 2, not counted as a session on the water; a weak signal in the learning) | Poor days teach what doesn't work; no extra button on the spot page | 0.14.2 |
| **No "start from my own ratings" option** | The owner changed her mind; the field stays for old diaries | 0.14.1 |
| **Own ranges are custom:** spotlog describes them, and you can adjust (Adjust › Save / Back to learned); yours count as confirmed | "Let it be custom, it learns and saves it but you can adjust it" | 0.14 |
| **Gear hints only after many sessions** per gear (8+) | Few sessions say nothing about gear | 0.14 |
| **Learned wind window is a suggestion** ("spotlog learned it works best … Use this"), never applied by itself | Not a default decision | 0.14 |

## Spot page

| Decision | Since |
|---|---|
| **Order:** forecast card → wind window card → When to go → What works here for you (fold-out, remembers open/closed; gear hints inside) → saved forecasts → sessions ("Which forecast to trust" removed in 0.16) | 0.16 |
| **When to go** shows only days with a match (today included), as stretches of at least two hours, with Windy's predictability "% sure" under each of the next days. "Nothing stands out today or in the next days." when none. No source line under it. | 0.15 |
| **What works here:** a table with Your range · Matters · Today (descriptive since 0.16: ranges of your well-rated outings, they don't drive the score). Matters is in words (a little / some / a lot), not bars. **No ✓ ~ ✕ symbols.** Today is green when it fits, orange when close. | 0.14.7 |
| What works, folded: one line per sport; "not sure yet" when nothing is known. Open with nothing known: "Not sure yet. Adjust your window or log a few sessions here…". The header line says where ranges come from (sessions / wind window / set by you) **only when there are some**. | 0.15.3 |

## Everywhere

| Decision | Since |
|---|---|
| **Naming matches the metric:** Wind, Wind direction, Gusts, Waves, Swell, Swell direction, Swell period, Wave power, Temperature, Rain ("Air" was unclear; "from" became "direction") | 0.15 |
| **Map card:** forecast tiles, the rating tag and the best stretch of today. **No reason list with symbols**; the why is in What works here. | 0.15 |
| **Sports:** Surf, Windsurf, Kite, Wing, plus your own under "Other…" (typed name, used everywhere). **No SUP.** Any sport can be picked when logging; a new one is added to the spot. | 0.15 |
| **Tiles:** gusts and waves under the wind and never cut off; they wrap on narrow tiles | 0.15 |
| **Tide:** the user never enters it. It comes from the forecast (saved highs/lows → the session's tide → the tide your best sessions had). Where tide data should come from long-term still needs research. | 0.14.5 |
| **Units:** everything follows the units pill (wind incl. Beaufort half steps, height, temperature) | 0.10 |
| **Name:** "spotlog" lowercase + pixel star in text; the wordmark SPOTLOG | 0.10 |
| **Dark background;** don't change the desktop UI unless asked | standing |
| The diary is kept in the browser for the beta; "Download a copy" / "Upload a copy" (upload merges, never replaces) | 0.11–0.12 |
