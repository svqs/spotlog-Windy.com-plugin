# Spotlog design

The design lives on the design canvas: <https://claude.ai/artifact/VBrdShhquX2setN3NSq82p>

| Canvas page | What it is |
|---|---|
| **v6 · as built (plugin 0.2)** | Snapshots of the real plugin screens, taken from the running code (not a mockup). This is the current truth. |
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
| ink | `#1c1c1c` | text on white / orange / light greens |
| orange | `#d49500` | the one highlight: primary buttons, slider marker, active states, spot dots (Windy's orange) |
| close red | `#c42f2f` | close button only |
| rating 1 · flat | `#c9474f` | very bad session |
| rating 2 · meh | `#6b6b6b` | bad session |
| rating 3 · good | `#9fcf7f` | |
| rating 4 · great | `#5fbf6a` | also "Match" tag |
| rating 5 · epic | `#3fa35a` | |
| wind colours | `#5b6ec2` → `#a23fa0` | Windy-like wind scale for tiles (`windColor` in `src/lib/wind.ts`, m/s stops 2, 4, 6, 8, 11, 14, 17, 22) |

**Type:** Instrument Sans (UI, 400/500/600) and Doto 900 (pixel font) only for the big numbers in the snapshot tiles and the SPOTLOG wordmark.
**Radii:** cards 18 px, buttons 12–14 px, chips 18 px (pill), tiles in the snapshot 12 px.
**Panel:** 400 px wide on desktop (Windy right-hand pane), fullscreen on phones.

## Components (where to find them)

| Component | File | Notes |
|---|---|---|
| Header card (wordmark, units pill, close, stats) | `src/plugin.svelte` (top) | On inner screens the header becomes back · title · units pill · close |
| Action buttons (Save forecast / Add spot / Log session) | `src/plugin.svelte` `.actions` / `.act` | First is orange; small second line shows time or context |
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
