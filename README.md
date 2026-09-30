# Spotlog · Windy plugin (0.3.0)

A session diary inside [Windy.com](https://www.windy.com) for surfers, windsurfers and kiters.
Save the forecast for a spot (numbers, not a screenshot), log how the session really felt, attach a GPS track,
and Spotlog learns which forecast model to trust at each spot and how good the conditions look for you right now.

| | |
|---|---|
| **Try it without Windy** | Sandbox with a fake Windy map and example data: <https://claude.ai/artifact/SV5qXC15ayC5wCURhqywoB> (private until shared from its Share menu) |
| **Design** | Design canvas, page “v6 · as built (plugin 0.2)”: <https://claude.ai/artifact/VBrdShhquX2setN3NSq82p> — see [DESIGN.md](DESIGN.md) |
| **For developers** | Architecture, stored data, publishing, review checklist: [DEVELOPER.md](DEVELOPER.md) |

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
4. Testers go to <https://www.windy.com/plugins> › **Load plugin directly from URL**, paste it and press **Install untrusted plugin**. Works in desktop and phone browsers; plugins don't run in the Windy mobile app.

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
| Do anything from anywhere | Home: **Save forecast**, **Add spot**, **Log session**. Each asks where (click the map, map centre, one of your spots, or no place). Clicking the map opens that place with the same three actions. Forecasts and sessions can be linked to a spot later. |
| Units | Pill at the top of every screen: wind m/s · kt · km/h · mph · bft, waves m · ft, °C · °F. Stored in SI, converted on screen. |
| What a forecast saves | Same pill: wind, gusts, direction always; temperature, waves, swell 1, period, power optional; every model on/off. Tides + water temp: “soon” (not in Windy's plugin API). |
| Spots | Directions + range, or “I don't know yet” → Spotlog suggests a wind window after two great sessions. Tiles show conditions now + a predicted rating after 3 sessions. |
| Spot page | White header with conditions now, Log / Save forecast / Show on map (zoom + popup), next good window, model ranking, saved forecasts (edit/delete), sessions (tap to open, swipe to delete). |
| Log a session | Date and time first, then rating (red flat → greens), draggable magnetic “felt like” ruler, gusts, water, saved gear (grouped by sport), GPX/TCX track, notes. Undo on saves and deletes. |
| Forecast snapshots | Save the whole day's forecast (05–22 h, every model). Pick an hour on the snapshot; when you log a session, the forecast follows your session time. |
| Your account | Home › Data › sign in with your email (6-digit code) and the diary syncs across devices. Needs the one-time Supabase setup in DEVELOPER.md; until then it's saved in the browser. |
| GPS route | GPX/TCX from Garmin Connect, Strava…: distance, time, top speed; drawn on the Windy map like Windy's distance tool. |
| Sessions | List or calendar. |
| Gear | Pick the sport (Windsurf, Surf, Kite, Wing), then what it is (board, sail, mast, boom, fin, harness, kite, bar, wing, foil, leash, wetsuit…). |

## Not yet

Push alerts · webcams · `.fit` import · tides / water temperature · mobile picker-dot flow · clicking Windy's own place labels (`poi-label`, untested).
