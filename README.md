# spotlog · Windy plugin

A session diary inside [Windy.com](https://www.windy.com) for surfers, windsurfers and kiters.
Save the forecast for a spot (numbers, not a screenshot), log how the session really felt, attach a GPS track,
and Spotlog learns which forecast model to trust at each spot and how good the conditions look for you right now.

| | |
|---|---|
| **Try it without Windy** | Sandbox with a fake Windy map and example data: <https://claude.ai/artifact/SV5qXC15ayC5wCURhqywoB> (private until shared from its Share menu) |
| **Design** | Style Lab (every colour, shape and phrase, with the real plugin live): <https://claude.ai/artifact/PWtJbKJMGekykAnzrLpsjD> — see [docs/ui-and-copy.md](docs/ui-and-copy.md) |
| **For developers and agents** | Start with [AGENTS.md](AGENTS.md), then [docs/](docs/README.md): architecture, data, learning, forecasts, testing, publishing, decisions, review checklist |

## Run it inside Windy (5 minutes)

Needs Node.js 18+.

```bash
npm install
npm start            # watch mode, serves https://localhost:9999/plugin.js
```

1. Open <https://localhost:9999/plugin.js> once and accept the self-signed certificate.
2. Open <https://www.windy.com/developer-mode> and load `https://localhost:9999/plugin.js`.
3. Spotlog opens in the right-hand panel. Saving a file in `src/` rebuilds it; reload the plugin to see the change.

## Share a test link (real Windy)

1. Create a **Windy Plugins API** key at <https://api.windy.com/keys>.
2. Publish: `WINDY_API_KEY=… npm run publish:windy` (or push to GitHub, add the key as the `WINDY_API_KEY` secret and run the **publish-plugin** action).
3. The response contains the install URL: `https://windy-plugins.com/<your user id>/windy-plugin-spotlog/<version>/plugin.min.js`.
4. Testers go to <https://www.windy.com/plugins> › **Load plugin directly from URL**, paste it and press **Install untrusted plugin**.
   On phones, install on a desktop first: Windy lists the installed plugin on your other devices too. After publishing a new
   version, install the new link on the desktop, remove older Spotlog entries from the installed plugins, then fully reload
   windy.com on the phone. The version number at the bottom of Spotlog's home screen shows which one is running. Works on desktop and on phones (in the phone it sits in Windy's small bottom panel under the timeline). Testers need to be logged in to Windy with Premium.

`private: true` in `src/pluginConfig.ts` keeps it out of the public gallery; only people with the URL can load it.
Going public later = `private: false` + a review request on the Windy community forum.

## Sandbox (no Windy needed)

```bash
npm run sandbox      # builds, rebuilds harness/sandbox.html, serves on :8765
# open http://localhost:8765/harness/index.html  (empty data)  or  /harness/sandbox.html  (example data)
python3 harness/e2e.py /tmp    # clicks through every flow (pip install playwright)
```

## What it does

| | |
|---|---|
| Who can use it | Logged-in Windy Premium members. Others see a short screen with **Log in to Windy** / **Get Windy Premium**. |
| Do anything from anywhere | Home: **Save forecast**, **Add spot**, **Log session**. Each asks where (click on the map, map centre, one of your spots, or no place). Clicking on the map opens that place with the same three actions. Forecasts and sessions can be linked to a spot later. |
| Units | Pill at the top of every screen: wind m/s · kt · km/h · mph · bft, waves m · ft, °C · °F. Stored in SI, converted on screen. |
| What a forecast saves | Same pill: wind, gusts, direction always; temperature, waves, swell 1, period, power optional; all models (default) or only the ones you pick. The spot page shows the spot's most accurate model (ECMWF until it knows), and you can switch to any model that covers the spot. |
| Spots | Directions + range, or “I don't know yet” → spotlog suggests a wind window after two great sessions. Tiles and map pins show conditions now + the best stretch of today (“Great for windsurf”, with the time when it starts later). spotlog learns per spot and sport what works for you: a range per condition (windsurf/kite/wing: wind, wind direction, gusts, waves; surf: swell, swell period, swell direction, wind, wind direction; plus temperature, rain, wave power) from the forecast of your great sessions, and how much each condition matters (poor sessions outside the range = it decides the day). The spot page shows your wind window, “When to go” (matching days with Windy's “% sure”), a fold-out “What works here for you” (Your range · Matters · Today, adjustable) and which forecast to trust. Only good news is shown (good, great, epic), else “Not sure yet”. How it works in detail: [docs/learning.md](docs/learning.md). |
| Spot page | White header with conditions now, model switch, Save forecast / Log session / Show on map (popup), next good window, model ranking, saved forecasts (edit/delete), sessions (tap to open, swipe to delete). |
| Log a session | Spot and sport (any sport; your own under “Other…”), date and time, rating or “Not worth it, didn't go”, draggable magnetic “felt like” ruler, gusts, water, saved gear (grouped by sport), GPX/TCX track, notes. The tide comes from the forecast, never typed in. Undo on saves and deletes. |
| Save forecast | Pick a place → check the forecast (right now; saved with it: the next 24 hours from every model) → link the spot (**Link to a spot** / **Edit linked spot**), add a note → **Save forecast**. One forecast per spot: saving another asks before replacing it (forecasts used by sessions stay). Tip: save before your session — Windy keeps no past forecasts. |
| Log session | Its own flow after the session: pick **Your last saved forecast**, click on the map, the map centre, one of your spots or no place → fill in → **Save session**. The forecast follows your session time. |
| Your data | Linked to your Windy account, no separate login: log in to Windy on another device and your diary is there (once the sync server from [docs/operations.md](docs/operations.md) is set up; until then it's kept in the browser). |
| GPS route | GPX/TCX from Garmin Connect, Strava…: distance, time, top speed; drawn on the Windy map as a thin pink line. Sessions show as a glow on the map (brighter where you've been out more); zoomed out, spots become dots too. |
| Sessions | List or calendar. |
| How it works | Beta: the diary is saved in this browser. “Download a copy” / “Upload a copy” to keep or move it; friendly how-to; “Delete everything”; Give feedback (Windy Community). |
| Gear | Pick the sport (Windsurf, Surf, Kite, Wing), then what it is (board, sail, mast, boom, fin, harness, kite, bar, wing, foil, leash, wetsuit…). |

## Not yet

Push alerts · webcams · `.fit` import · mobile picker-dot flow · clicking Windy's own place labels (`poi-label`, untested).
