# Spotlog design

The design lives on the design canvas: <https://claude.ai/artifact/VBrdShhquX2setN3NSq82p>

| Canvas page | What it is |
|---|---|
| **v6 · as built (plugin 0.5)** | Snapshots of the real plugin screens, taken from the running code (not a mockup). This is the current truth. |
| v5 · final draft | The design the 0.1/0.2 code was built from. |
| v1–v4 | Earlier explorations. |

## How to change the design

1. On the canvas, duplicate the **v6** page (or the boards you want to change) into a new page, e.g. **v7**.
2. Change what you like. Leave a short note on the board saying what changed and why.
3. Ask Claude: *"Update the plugin to match canvas page v7"* (give the canvas link). The code is updated, rebuilt, tested, and a fresh "as built" page is captured from the new code.

Anything that is purely visual (colours, spacing, type, order of blocks, labels, which buttons exist on a screen) is a design change like this.
Changes to what is stored, where it is stored, or new data sources are backend/data changes — see DEVELOPER.md.

## Tokens

The same values appear in `src/plugin.svelte` (`@ground`, `@card` … at the top of the `<style>` block) and in every `src/ui/*.svelte` file.

| Token | Value | Used for |
|---|---|---|
| ground | `#2e2e2e` | panel background |
| card | `#3c3c3c` | cards, tabs, inputs |
| line | `#4d4d4d` | card borders, dividers |
| outline | `#5a5a5a` | ghost buttons, chips, fields |
| text | `#f8f8f8` | text on dark; white snapshot card; selected chips |
| sub | `#b0b0b0` | secondary text |
| ink | `#1c1c1c` | text on white and on the light snapshot tiles |
| orange | `#d49500` | the one highlight: primary buttons (**white text**), slider marker, active states, spot dots (Windy's orange) |
| rating 1 · flat | `#c9474f` | very bad session |
| rating 2 · meh | `#6b6b6b` | bad session |
| rating 3 · good | `#4fae68` | white text |
| rating 4 · great | `#34985a` | white text, also "Match" tag |
| rating 5 · epic | `#1f8249` | white text |
| wind colours | `#5b6ec2` → `#a23fa0` | Windy-like wind scale for tiles (`windColor` in `src/lib/wind.ts`, m/s stops 2, 4, 6, 8, 11, 14, 17, 22) |

**Readability rule:** text on orange, green and red is always white.
**Close:** Windy draws its own ✕ outside the pane on desktop (left of it) and in the sheet header on phones, so the units pill sits in the top-right corner.

**Type:** Instrument Sans (UI, 400/500/600) and Doto 900 (pixel font) only for the big numbers in the snapshot tiles and the SPOTLOG wordmark.
**Name in text:** whenever Spotlog is mentioned in a sentence it gets the little pixel star after it, in the normal text font (`src/ui/Brand.svelte`). Tone of voice (About tab): casual, a bit nerdy, a wink now and then ("whatever floats your board"), never shouty.
**Radii:** cards 18 px, buttons 12–14 px, chips 18 px (pill), tiles in the snapshot 12 px.
**Panel:** 400 px wide on desktop (Windy right-hand pane), fullscreen on phones.

## Components (where to find them)

| Component | File | Notes |
|---|---|---|
| Choose a place (Save forecast / Add spot / Log session) | `src/plugin.svelte` `.opts` / `.opt` | Every choice is the same rectangular row: Click/Tap on the map, Map centre, Without a place, your spots |
| Phone layout | `src/plugin.svelte` `.spotlog.m` | Windy's small bottom panel under the timeline (like The Buoy): half the screen high (`50dvh`), scrolls inside; swipes stay with Spotlog while it can still scroll |
| Login / Premium gate | `src/plugin.svelte` top of the template | |
| Header card (wordmark, units pill, stats, sync line) | `src/plugin.svelte` (top) | SPOTLOG wordmark + small pixel star (`src/ui/PixelStar.svelte`); on inner screens: back · title · units pill top right |
| About + Buy me a coffee | `src/plugin.svelte` `.about`, `.sig`, link in `src/lib/links.ts` | About tab only: how-to steps, then pixel star · version · coffee link as a signature |
| Model switch | `src/plugin.svelte` `.models-pick` | Spot page, under the card: ECMWF by default, only models that cover the spot |
| Replace prompt | `src/plugin.svelte` `.replace` | One forecast per spot |
| Map marks | `.spotlog-pin` (+ `.compact` below zoom 7), `.spotlog-sess` (session dots), route `#ff3d8b` 2.5 px | |
| Gear by sport | `src/plugin.svelte` gear tab, presets in `src/lib/wind.ts` `GEAR_BY_SPORT` | |
| Action buttons (Save forecast / Add spot / Log session) | `src/plugin.svelte` `.actions` / `.act` | All three equal grey tiles: line icon, name, short context line |
| White snapshot card (Windy point-forecast look) | `src/ui/SnapCard.svelte` | Wind, gusts, direction, waves tiles; badge; "Full snapshot" expands |
| Felt-like ruler | `src/ui/FeltSlider.svelte` | Whole ruler drags under a fixed orange marker; magnetic (`MAGNET`), tick spacing (`PX`) |
| Time wheel popover | `src/ui/TimeWheel.svelte` | Small popover above the field; 12/24 h from system settings |
| Swipe row | `src/ui/SwipeRow.svelte` | Tap opens, swipe left reveals Delete |
| Calendar | `src/ui/Calendar.svelte` | Monday first, rating-coloured dots |
| Units + saved layers sheet | `src/ui/Settings.svelte` | |
| Map: spot labels, route, popup | `src/plugin.svelte` `:global(.spotlog-*)` styles, `drawSpotMarkers`, `drawTrack`, `popupHtml` | Route = white line with dark edge, orange start dot, end dot, distance label (like Windy's distance tool) |

## Open design questions

- Route style is a first pass; tune once real GPS tracks are loaded in real Windy (line width, colour by speed like Strava?).
- Mobile: Windy's picker dot flow for choosing a place is not designed/built yet.
- Webcams and alerts (from the early drafts) are not in 0.2.
