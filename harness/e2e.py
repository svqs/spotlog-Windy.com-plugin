"""End-to-end check of the compiled Spotlog plugin (current build) inside the fake-Windy harness.

Run:  python3 -m http.server 8765  (from the project root), then  python3 harness/e2e.py <screenshot dir>
"""
import json, sys, os, re, datetime
from playwright.sync_api import sync_playwright

URL = os.environ.get('SPOTLOG_TEST_URL', 'http://localhost:8765/harness/index.html')
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
os.makedirs(OUT, exist_ok=True)
GPX = os.path.join(os.path.dirname(__file__), 'session.gpx')
# Fixed browser day and seeded track make Today/next-day checks independent of the real clock.
TEST_DAY = '2026-10-04'
TEST_TIME = datetime.datetime(2026, 10, 4, 12, tzinfo=datetime.timezone.utc)
import subprocess, tempfile
GPX = os.path.join(tempfile.gettempdir(), 'spotlog-session.gpx')
subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'make_gpx.py'), GPX, TEST_DAY], check=True, capture_output=True)
errors, steps = [], []


def ok(msg):
    steps.append(msg)
    print('✓', msg, flush=True)


def set_start(pg, hour='10'):
    """pick a start time with the time wheel (new sessions need one)"""
    pg.locator('.tw .field-btn').first.click()
    pg.wait_for_selector('.tw .tw-pop')
    pg.locator('.tw .tw-pop .col >> nth=0').locator('.it', has_text=hour).first.click()
    pg.click('.tw .tw-pop .done')


def stored(pg):
    return pg.evaluate("JSON.parse(localStorage.getItem('windy-plugin-spotlog:v1:u12345') || localStorage.getItem('windy-plugin-spotlog:v1') || '{}')")


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, locale='en-GB', timezone_id='UTC')
    pg = ctx.new_page()
    pg.clock.install(time=TEST_TIME)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    requests = []
    pg.on('request', lambda r: requests.append(r.url))
    pg.on('console', lambda m: errors.append('console.' + m.type + ': ' + m.text) if m.type == 'error' and 'ERR_TUNNEL' not in m.text else None)
    pg.goto(URL)
    pg.evaluate('localStorage.clear()')
    pg.reload()
    pg.wait_for_selector('.spotlog')
    shot = lambda n: pg.screenshot(path=f'{OUT}/{n}.png')
    pane = pg.locator('#pane .spotlog')  # the plugin scrolls itself (Windy's pane does not)
    bottom = lambda: pane.evaluate('el => el.scrollTo(0, el.scrollHeight)')
    top = lambda: pane.evaluate('el => el.scrollTo(0, 0)')
    # someone new: a short welcome first, once
    pg.wait_for_selector('.welcome .btn.primary:has-text("Let\'s start")')
    assert pg.locator('.welcome .beta').count() == 1
    assert pg.locator('.welcome label:has-text("Have a copy? Upload it") input[type=file]').count() == 1
    shot('00-welcome')
    pg.click('.welcome .btn.primary')
    pg.wait_for_selector('.head .back-menu')
    assert stored(pg)['settings']['welcomed'] is True
    pg.reload()
    pg.wait_for_selector('.head .back-menu')
    assert pg.locator('.welcome').count() == 0, 'the welcome shows only once'
    ok('new user: a welcome once, "Let\'s start" opens spotlog, never shown again')
    # beta: the tag by the wordmark and a quiet line under the tab
    assert pg.locator('.head .beta').count() == 1 and pg.locator('.beta-note').count() == 1
    shot('01-home-empty')
    pg.wait_for_selector('.head .back-menu')
    assert pg.locator('text=Windy menu').count() == 0
    msgs = []
    pg.on('console', lambda m: msgs.append(m.text))
    pg.click('.head .back-menu')
    pg.wait_for_timeout(100)
    assert any("rqstOpen menu" in m for m in msgs) and not any("rqstClose" in m for m in msgs), msgs
    ok('desktop: arrow back to the Windy menu')

    # --- Add spot from home: pick on the map, "I know" the wind
    pg.click('.act:has-text("Add spot")')
    pg.wait_for_selector('text=Click on the map')
    pg.click('.label:has-text("Valdevaqueros")')
    pg.wait_for_selector('text=Which forecast wind works here?')
    assert pg.input_value('.field input') == 'Valdevaqueros'
    pg.click('.dir >> nth=2')
    pg.click('.dir >> nth=3')
    shot('02-new-spot')
    pg.click('text=Save spot')
    pg.wait_for_selector('.snap .cells', timeout=8000)
    ok('add spot via map label, lands on the spot page with a white conditions header')
    pg.wait_for_selector('.models-pick button:has-text("GFS")', timeout=8000)
    assert pg.locator('.models-pick button.on').inner_text() == 'ECMWF'
    assert pg.locator('.models-pick button:has-text("AROME")').count() == 0, 'AROME does not cover Tarifa'
    pg.click('.models-pick button:has-text("GFS")')
    pg.wait_for_selector('.snap:has-text("GFS")', timeout=8000)
    pg.click('.models-pick button:has-text("ECMWF")')
    ok('spot page: ECMWF by default, switch to any model available there')
    assert pg.locator('.act.primary').count() == 0
    assert pg.locator('.act:has-text("Show on map") small').count() == 0
    shot('03-spot')

    # --- Save forecast: preview first, nothing stored until "Save forecast"; no undo bar afterwards (0.18.4)
    pg.click('.act:has-text("Save forecast")')
    pg.wait_for_selector('.snap:has-text("Not saved yet")', timeout=8000)
    assert len(stored(pg).get('snapshots', [])) == 0
    assert pg.locator('text=Log a session with this').count() == 0
    shot('03b-forecast-preview')
    pg.click('.btn.primary:has-text("Save forecast")')
    pg.wait_for_selector('.mini:has-text("Edit")', timeout=8000)
    assert len(stored(pg)['snapshots']) == 1
    s0 = stored(pg)['snapshots'][0]
    now_h = pg.evaluate('Math.floor(Date.now() / 3600000) * 3600000')
    assert s0['series']['ts'][0] == now_h and len(s0['series']['ts']) == 25, (s0['series']['ts'][0], now_h, len(s0['series']['ts']))
    ok('save forecast: preview, then save; keeps now + the next 24 hours')
    assert pg.locator('.toast .undo').count() == 0 and pg.locator('.toast:has-text("Forecast saved")').count() == 0
    ok('no undo bar after saving (things can be deleted later instead)')
    ok('saved forecast row has Edit + Delete')

    # --- Show on map -> popup with current conditions (a switch on desktop)
    if pg.locator('.mock-popup .sl-pop').count():
        pg.click('.act:has-text("Show on map")')
        pg.wait_for_timeout(300)
    assert pg.locator('.mock-popup .sl-pop').count() == 0
    pg.click('.act:has-text("Show on map")')
    pg.wait_for_selector('.mock-popup .sl-pop', timeout=300)  # right away, no waiting for the map
    pg.wait_for_selector('.mock-popup .sl-tiles', timeout=5000)
    pg.wait_for_timeout(1500)
    assert pg.locator('.mock-popup .sl-pop').count() == 1, 'popup should stay'
    pg.click('.act:has-text("Show on map")')
    pg.wait_for_timeout(200)
    assert pg.locator('.mock-popup .sl-pop').count() == 0, 'tapping again hides it'
    pg.click('.act:has-text("Show on map")')
    pg.wait_for_selector('.mock-popup .sl-pop', timeout=5000)
    ok('show on map opens a popup right away, it stays, tapping again closes it')
    shot('04-show-on-map')

    # --- Log a session: when, rating, gear, GPX (no felt-wind ruler, gust or water chips any more)
    pg.click('.act:has-text("Log session")')
    pg.wait_for_selector('.ratings')
    pg.click('.rate:has-text("epic")')
    assert pg.locator('.felt').count() == 0 and pg.locator('.chip:has-text("Gusty")').count() == 0 and pg.locator('.chip:has-text("Chop")').count() == 0
    assert pg.locator('.btn:has-text("Save session")').is_disabled(), 'a new session needs its start time'
    pg.wait_for_selector('text=Add when you started')
    ok('log form: when, rating, gear, track and notes; Save waits for the start time')
    assert pg.locator('.chip:has-text("Rising")').count() == 0  # no tide to log: it comes from the forecast
    pg.fill('input[placeholder^="e.g. Sail"]', 'Sail 5.3')
    pg.click('text=Save to gear')
    pg.wait_for_selector('.chip.on:has-text("Sail 5.3")')
    ok('typed gear saved to gear list and selected')
    pg.set_input_files('input[type=file][accept^=".gpx"]', GPX)
    pg.wait_for_selector('text=Top speed', timeout=5000)
    pg.wait_for_selector('.mock-line polyline')
    start_txt = pg.locator('.tw .field-btn >> nth=0').inner_text()
    assert pg.locator('.mock-line [stroke="#ff3d8b"]').count() >= 1, 'route is not the thin pink line'
    assert pg.locator('.btn:has-text("Save session")').is_enabled()
    ok(f'GPX track attached, drawn on map as a thin pink line, start time filled ({start_txt}), Save ready')
    shot('05-log-track')
    # time wheel: open end time and pick a value by clicking an hour
    pg.click('.tw .field-btn >> nth=1')
    pg.wait_for_selector('.tw .tw-pop')
    pg.locator('.tw .tw-pop .col >> nth=0').locator('.it', has_text='17').click()
    pg.wait_for_timeout(700)
    shot('06-time-wheel')
    pg.click('.tw .tw-pop .done')
    assert pg.locator('.tw .tw-pop').count() == 0
    end_txt = pg.locator('.tw .field-btn >> nth=1').inner_text()
    assert end_txt.startswith('17:'), end_txt
    ok(f'time wheel sets end time ({end_txt})')
    use = pg.locator('.btn:has-text("Use the forecast for your session hours")')
    pg.wait_for_timeout(700)
    if use.count():  # the forecast was saved after this session's hours (test runs late in the day)
        use.click()
    pg.wait_for_selector('.snap:has-text("Forecast for your session time")', timeout=8000)
    ok('snapshot card follows the session time')
    pg.fill('textarea', 'Gusty inside until 3 pm, then clean.')
    bottom()
    pg.click('text=Save session')
    pg.wait_for_selector('text=Sessions here')
    se = stored(pg)['sessions'][0]
    assert se['rating'] == 5 and se['track'] and se['gearIds'] and 'felt' not in se, se
    sn = next(x for x in stored(pg)['snapshots'] if x['id'] == se['snapshotId'])
    assert sn['series'].get('tide', {}).get('highs'), 'tides saved with the day'
    ok('session saved with rating, gear and track (no felt wind, gusts or water); the tide is saved with the forecast')
    pg.wait_for_selector('.reco .reco-row:has-text("Today")')
    pg.wait_for_function("document.querySelectorAll('.reco .reco-row').length >= 3", timeout=10000)
    reco = pg.locator('.reco').inner_text().replace('\n', ' ')
    assert '% sure' in reco, reco
    ok('spot page "When to go": today and the next days, with Windy\'s predictability: ' + reco[:160])
    # what works here: folded to a line, opens to the details (and stays open), adjust a range
    assert pg.locator('.works-sum').count() == 1 and pg.locator('.works .w-grid').count() == 0
    pg.click('.works-head')
    pg.wait_for_selector('.works .w-grid .w-range')
    assert stored(pg)['settings']['worksOpen'] is True
    pg.locator('.works').scroll_into_view_if_needed()
    shot('05b-works-open')
    pg.click('.works .w-head .link:has-text("Adjust")')
    pg.wait_for_selector('.w-grid.edit input')
    waves = pg.locator('.w-grid.edit .w-name:text-is("Waves") + .w-inputs input').nth(1)
    waves.fill('0.4')
    pg.click('.works .btn.primary:has-text("Save")')
    pg.wait_for_timeout(800)  # (no "Your ranges are saved" message since 0.18.5)
    sp = stored(pg)['spots'][0]
    assert abs(sp['ranges'][sp['sports'][0]]['waves']['hi'] - 0.4) < 0.01, sp.get('ranges')
    assert pg.locator('.works .w-you').count() >= 1
    ok('what works here: folded line, opens with ranges, how much each matters and today; your own range is saved and marked')
    pg.click('.works .w-head .link:has-text("Adjust")')
    pg.click('.works .link:has-text("Back to learned")')
    pg.wait_for_timeout(800)  # (no "Back to what spotlog learned" message since 0.18.5)
    assert not stored(pg)['spots'][0].get('ranges'), stored(pg)['spots'][0].get('ranges')
    ok('"Back to learned" removes your own ranges')
    sd = stored(pg)
    sn = next(x for x in sd['snapshots'] if x['id'] == se['snapshotId'])
    import datetime as _dt
    hr = _dt.datetime.fromtimestamp(sn['ts'] / 1000).hour
    assert sn.get('series') and 12 <= hr <= 18, (hr, bool(sn.get('series')))  # middle of the GPX start and the 17:xx end (moves with the clock)
    ok(f'saved forecast moved to the session time ({hr}:00) and keeps the 24 hours')

    # --- open session from list, back, then swipe-left delete + undo
    pg.click('.sw .front >> nth=0')
    pg.wait_for_selector('text=Save changes')
    ok('tapping a session opens it for editing')
    top()
    pg.click('button[aria-label="Back"]')
    pg.wait_for_selector('text=Sessions here')
    row = pg.locator('.sw .front').first
    row.scroll_into_view_if_needed()
    pg.wait_for_timeout(200)
    rb = row.bounding_box()
    pg.mouse.move(rb['x'] + rb['width'] - 20, rb['y'] + rb['height'] / 2)
    pg.mouse.down()
    pg.mouse.move(rb['x'] + rb['width'] - 140, rb['y'] + rb['height'] / 2, steps=8)
    pg.mouse.up()
    pg.wait_for_timeout(300)
    shot('07-swipe-delete')
    kept = stored(pg)['sessions'][0]
    pg.click('.sw .del >> nth=0')
    pg.wait_for_timeout(300)
    assert len(stored(pg)['sessions']) == 0
    assert pg.locator('.toast .undo').count() == 0, 'no undo bar after deleting'
    # the rest of the story goes on with that session: put it back in the diary as it was
    pg.evaluate("""s => { const k = localStorage.getItem('windy-plugin-spotlog:v1:u12345') ? 'windy-plugin-spotlog:v1:u12345' : 'windy-plugin-spotlog:v1'; const d = JSON.parse(localStorage.getItem(k));
        d.sessions.push(s); delete (d.deleted || {})[s.id]; d.revived = { ...(d.revived || {}), [s.id]: Date.now() }; d.updatedAt = Date.now(); localStorage.setItem(k, JSON.stringify(d)); }""", kept)
    pg.reload()
    pg.wait_for_selector('.spotlog')
    pg.wait_for_function("() => [...document.querySelectorAll('.stats .big')].some(x => x.textContent.trim() === '1')")
    ok('swipe left reveals delete; no undo bar')

    # --- home: tiles show current conditions; units switch to knots
    top()
    if pg.locator('button[aria-label="Back"]').count():  # (after the reload above we're already home)
        pg.click('button[aria-label="Back"]')
    pg.wait_for_selector('.tile .now .sw', timeout=8000)
    pg.click('.units')
    pg.click('.seg button:has-text("kt")')
    pg.wait_for_selector('.tile:has-text("kt")')
    shot('08-home-units-kt')
    pg.click('.units')
    ok('units pill switches to knots everywhere')
    pg.click('.viewtog button[aria-label="List"]')
    pg.wait_for_selector('.tiles.list .tile')
    assert stored(pg)['settings']['spotView'] == 'list'
    shot('08b-spots-list')
    pg.click('.viewtog button[aria-label="Tiles"]')
    assert pg.locator('.tiles.list').count() == 0
    ok('− shows the spots as a list, + as tiles')

    # --- home: Save forecast at your current location -> snapshot view, link to spot, delete
    pg.click('.act:has-text("Save forecast")')
    pg.wait_for_selector('text=Your current location')
    assert pg.locator('text=Map centre').count() == 0
    pg.click('.opt:has-text("Your current location")')
    pg.wait_for_selector('.snap:has-text("Not saved yet")', timeout=8000)
    shot('09-snapshot-view')
    # the map is centred on the spot after "Show on map", so the forecast links itself; otherwise link it by hand
    assert pg.locator('.hours .hr').count() == 0, 'no hour switching on a forecast'
    pg.wait_for_selector('.sl-note:has-text("next 24 hours")')
    if pg.locator('.btn:has-text("Edit linked spot")').count() == 0:
        pg.click('.btn:has-text("Link to a spot")')
        pg.click('.chip:has-text("Valdevaqueros")')
    pg.wait_for_selector('.btn:has-text("Edit linked spot")')
    pg.click('.btn:has-text("Edit linked spot")')
    pg.wait_for_selector('.chip:has-text("No spot")')
    pg.click('.btn:has-text("Done")')
    ok('forecast from home at map centre, linked to the spot; "Edit linked spot" to change it')
    n0 = len(stored(pg)['snapshots'])
    pg.fill('textarea', 'Maybe after work')
    pg.click('.btn.primary:has-text("Save forecast")')
    pg.wait_for_timeout(300)
    if pg.locator('.replace').count():
        pg.click('.replace .btn:has-text("Replace")')
        pg.wait_for_timeout(600)  # (no "Forecast replaced" bar since 0.18.4: no undo)
        assert len(stored(pg)['snapshots']) == n0
    else:
        pg.wait_for_timeout(600)  # (no "Forecast saved" bar since 0.18.4: no undo)
        assert len(stored(pg)['snapshots']) == n0 + 1
    last = max(stored(pg)['snapshots'], key=lambda x: x['savedAt'])
    assert last['note'] == 'Maybe after work', last
    ok('note, then save')
    # one forecast per spot: saving another for the same spot asks first
    pg.click('.tile:has-text("Valdevaqueros")')
    pg.click('.act:has-text("Save forecast")')
    pg.wait_for_selector('.btn.primary:has-text("Save forecast")', timeout=8000)
    pg.click('.btn.primary:has-text("Save forecast")')
    pg.wait_for_selector('.replace:has-text("You already saved a forecast for Valdevaqueros")')
    shot('09a-replace')
    pg.click('.replace .btn:has-text("Keep the old one")')
    assert pg.locator('.replace').count() == 0
    n1 = len(stored(pg)['snapshots'])
    pg.click('.btn.primary:has-text("Save forecast")')
    pg.click('.replace .btn:has-text("Replace")')
    pg.wait_for_timeout(600)  # (no "Forecast replaced" bar since 0.18.4: no undo)
    sd = stored(pg)
    used = {x['snapshotId'] for x in sd['sessions']}
    pend = [x for x in sd['snapshots'] if x['spotId'] and x['id'] not in used]
    assert len(sd['snapshots']) == n1 and len(pend) == 1, (n1, len(sd['snapshots']), len(pend))
    ok('one forecast per spot: asks, then replaces (forecasts used by sessions stay)')
    top()
    pg.click('button[aria-label="Back"]')

    # --- log a session from the last saved forecast
    top()
    pg.click('.act:has-text("Log session")')
    pg.wait_for_selector('.opt:has-text("Your last saved forecast")')
    shot('09b-log-pick')
    pg.click('.opt:has-text("Your last saved forecast")')
    pg.wait_for_selector('.ratings')
    ok('log session: "Your last saved forecast" opens the log with that forecast')
    top()
    pg.click('button[aria-label="Back"]')

    # --- log a session without a place, add the spot later
    top()
    if pg.locator('button[aria-label="Back"]').count():
        pg.click('button[aria-label="Back"]')
    pg.wait_for_selector('.act:has-text("Log session")')
    pg.click('.act:has-text("Log session")')
    pg.click('.opt:has-text("Without a place")')
    pg.wait_for_selector('text=No spot yet')
    pg.click('.rate:has-text("meh")')
    set_start(pg)
    bottom()
    pg.click('text=Save session')
    pg.wait_for_selector('.tabs button.on:has-text("Sessions")')
    ok('session without a spot saved, shows in Sessions')
    pg.click('.seg button:has-text("Calendar")')
    pg.wait_for_selector('.cal')
    shot('10-calendar')
    pg.click('.day.has >> nth=0')
    pg.wait_for_selector('.picked .it')
    pg.click('.picked .it >> nth=0')
    pg.wait_for_selector('text=Save changes')
    ok('calendar day opens the session')
    # add spot later
    if pg.locator('.chip:has-text("Valdevaqueros")').count():
        pg.click('.chip:has-text("Valdevaqueros")')
    bottom()
    pg.click('text=Save changes')

    # --- gear tab
    top()
    pg.goto(URL)
    pg.wait_for_selector('.spotlog')
    pg.click('.tabs button:has-text("Gear")')
    pg.click('.seg button >> text="Surf"')
    pg.click('.chip:has-text("Leash")')
    pg.click('.card input')
    pg.keyboard.type("6' comp")  # real key presses: Windy must not steal them (search) or eat the space (timeline)
    assert pg.input_value('.card input') == "6' comp", pg.input_value('.card input')
    pg.click('.card .btn:has-text("Add")')
    pg.wait_for_selector('.item:has-text("comp")')
    ok('typing (with spaces) stays in Spotlog\'s field, not in Windy\'s search')
    g = [x for x in stored(pg)['gear'] if x['name'] == "6' comp"][0]
    assert g['sport'] == 'Surf' and g['kind'] == 'Leash', g
    shot('11-gear')
    ok('gear tab: sport first, then sport-specific kinds')

    # --- sync: linked to the Windy account automatically (fake server in the harness, keyed by Windy user id)
    assert pg.locator('.tabs button:has-text("Data")').count() == 0
    pg.wait_for_selector('.sync:has-text("Windy account")')
    assert pg.locator('input[type=email]').count() == 0
    cloud = pg.evaluate("JSON.parse(localStorage.getItem('spotlog-mock-cloud'))")
    row = cloud['rows']['12345']
    assert len(row['data']['sessions']) >= 1, row
    ok('diary syncs to the Windy user id, no separate sign-in')
    assert pg.locator('.coffee').count() == 0, 'feedback link only on About'
    pg.click('.tabs button:has-text("How it works")')
    pg.wait_for_selector('.beta-card:has-text("in beta")')
    pg.wait_for_selector('.sig .coffee:has-text("Give feedback")')
    assert 'community.windy.com' in pg.get_attribute('.sig .coffee', 'href')
    assert pg.locator('text=Buy me a coffee').count() == 0
    assert pg.locator('.beta-note').count() == 0, 'the full beta card replaces the short line here'
    shot('11b-about')
    ok('How it works: beta explained, how-to, "Give feedback" (Windy Community) only there')
    # upload a downloaded copy (from another device): it adds to what's here
    copy = stored(pg)
    n_spots = len(copy['spots'])
    copy['spots'].append({**copy['spots'][0], 'id': 'from-other-phone', 'name': 'Other phone spot', 'lat': copy['spots'][0]['lat'] + 0.6, 'lon': copy['spots'][0]['lon'] - 0.9})
    pg.set_input_files('.beta-card input[type=file]', files=[{'name': 'spotlog-copy.json', 'mimeType': 'application/json', 'buffer': json.dumps(copy).encode()}])
    pg.wait_for_timeout(800)  # (no "Copy uploaded" message since 0.18.5)
    after = stored(pg)
    assert len(after['spots']) == n_spots + 1 and any(x['id'] == 'from-other-phone' for x in after['spots'])
    pg.set_input_files('.beta-card input[type=file]', files=[{'name': 'notes.json', 'mimeType': 'application/json', 'buffer': b'{"hello": 1}'}])
    pg.wait_for_selector('.toast:has-text("isn")')
    assert len(stored(pg)['spots']) == n_spots + 1, 'a wrong file changes nothing'
    ok('upload a copy: adds the spots and sessions from it; a wrong file is refused with a clear message')
    # the bug from the beta: download, delete everything, upload again (a diary from before 0.11 has no welcome mark)
    key = pg.evaluate("Object.keys(localStorage).find(k => k.startsWith('windy-plugin-spotlog:v1'))")
    pg.evaluate("k => { const d = JSON.parse(localStorage.getItem(k)); delete d.settings.welcomed; localStorage.setItem(k, JSON.stringify(d)); }", key)
    pg.reload()
    pg.wait_for_selector('.spotlog')
    assert pg.locator('.welcome').count() == 0, 'someone with a diary is not new'
    pg.click('.tabs button:has-text("How it works")')
    with pg.expect_download() as dl:
        pg.click('.beta-card .btn:has-text("Download")')
    copy_path = dl.value.path()
    full = stored(pg)
    pg.click('.link.danger')
    pg.click('.link.danger')
    pg.wait_for_timeout(600)  # (no "All data deleted" bar since 0.18.4: no undo)
    assert len(stored(pg)['spots']) == 0 and pg.locator('.welcome').count() == 0, 'after deleting, How it works stays (no welcome)'
    pg.set_input_files('.beta-card input[type=file]', copy_path)
    pg.wait_for_timeout(800)  # (no "Copy uploaded" message since 0.18.5)
    back = stored(pg)
    assert len(back['spots']) == len(full['spots']) and len(back['sessions']) == len(full['sessions']) and not any(x['id'] in (back.get('deleted') or {}) for k in ('spots', 'sessions', 'snapshots', 'gear') for x in full[k]), (len(back['spots']), len(full['spots']), back.get('deleted'))  # older deletes may stay remembered
    pg.reload()
    pg.wait_for_selector('.spotlog')
    assert len(stored(pg)['sessions']) == len(full['sessions'])
    ok(f'download, delete everything, upload: all {len(full["spots"])} spots and {len(full["sessions"])} sessions come back (and stay after a reload)')
    # the same with a second Windy tab open: that tab still remembers "all deleted" and must not wipe the upload again
    other = ctx.new_page()
    other.clock.install(time=TEST_TIME)
    other.goto(URL)
    other.wait_for_selector('.spotlog')
    pg.click('.tabs button:has-text("How it works")')
    pg.click('.link.danger')
    pg.click('.link.danger')
    pg.wait_for_timeout(600)  # (no "All data deleted" bar since 0.18.4: no undo)
    other.wait_for_function("() => [...document.querySelectorAll('.stats .big')].some(x => x.textContent.trim() === '0')")
    pg.set_input_files('.beta-card input[type=file]', copy_path)
    pg.wait_for_timeout(800)  # (no "Copy uploaded" message since 0.18.5)
    pg.wait_for_timeout(1500)
    assert len(stored(pg)['sessions']) == len(full['sessions']), len(stored(pg)['sessions'])
    other.wait_for_function(f"() => [...document.querySelectorAll('.stats .big')].some(x => x.textContent.trim() === '{len(full['sessions'])}')")
    other.close()
    ok('upload with a second Windy tab open: the other tab shows the uploaded diary too, nothing gets wiped')

    # --- two Windy tabs open at once must not overwrite each other
    pg2 = ctx.new_page()
    pg2.clock.install(time=TEST_TIME)
    pg2.goto(URL)
    pg2.wait_for_selector('.spotlog')
    pg2.click('.tabs button:has-text("Gear")')
    pg2.fill('.card input', 'Tab two board')
    pg2.click('.card .btn:has-text("Add")')
    pg2.wait_for_timeout(300)
    pg.click('.tabs button:has-text("Gear")')
    pg.fill('.card input', 'Tab one sail')
    pg.click('.card .btn:has-text("Add")')
    pg.wait_for_timeout(300)
    names = [g['name'] for g in stored(pg)['gear']]
    assert 'Tab two board' in names and 'Tab one sail' in names, names
    pg2.close()
    ok('two open tabs merge instead of overwriting each other')

    # --- deleting stays deleted after a sync (tombstones)
    pg.click('.item:has-text("Tab one sail") .link.danger')
    pg.wait_for_timeout(1600)
    cloud = pg.evaluate("JSON.parse(localStorage.getItem('spotlog-mock-cloud'))")
    row = cloud['rows']['12345']
    assert 'Tab one sail' not in [g['name'] for g in row['data']['gear']]
    assert any(v for v in row['data'].get('deleted', {}).values())
    ok('a delete syncs and is remembered')

    # --- account gate: everyone logged in to Windy gets in (no Premium needed for now); logged out sees the login
    pg.evaluate("W.store.set('subscription', null)")
    pg.wait_for_timeout(300)
    assert pg.locator('b:has-text("is part of Windy Premium")').count() == 0 and pg.locator('.act:has-text("Save forecast")').count() >= 1
    pg.evaluate("W.store.set('user', null)")
    pg.wait_for_selector('b:has-text("Log in to Windy to use")')
    shot('11c-gate')
    pg.evaluate("W.store.set('user', { id: 12345, username: 'sophia', email: 'sophia@example.com' }); W.store.set('subscription', 'premium')")
    pg.wait_for_selector('.act:has-text("Save forecast")')
    ok('logged-in Windy users get in without Premium; logged out sees the login; the diary comes back after logging in again')

    # --- a spot where you don't know the wind yet (click on the empty map)
    pg.click('.tabs button:has-text("Spots")')
    pg.mouse.click(260, 560)
    pg.wait_for_selector('text=Add spot')
    pg.wait_for_selector('.snap .cells', timeout=8000)
    shot('12-place')
    # every session place glows on the map; a new place adds a glow
    h0 = pg.locator('.spotlog-heat').count()
    assert h0 >= 1, h0
    pg.click('.act:has-text("Log session")')
    pg.wait_for_selector('.ratings')
    set_start(pg)
    bottom()
    pg.click('text=Save session')
    pg.wait_for_function(f"document.querySelectorAll('.spotlog-heat').length > {h0}")
    ok('sessions show as a glow on the map, one per place')
    # hover shows the dates; the switches hide and show spots and sessions
    top()
    pg.click('.tabs button:has-text("Spots")')
    heat = pg.locator('.spotlog-heat').last  # the one just logged, in view
    # a spot that lights up today (time-of-day dependent) can draw its mark on top of the glow: let the hover through
    pg.add_style_tag(content='.mock-marker:not(:has(.spotlog-heat)) { pointer-events: none !important; }')
    heat.hover()
    pg.wait_for_selector('.spotlog-tip:visible')
    pg.evaluate("document.querySelectorAll('style').forEach(s => s.textContent.includes(':has(.spotlog-heat)') && s.remove())")
    shot('12b-heat-tip')
    pg.mouse.move(5, 5)
    pg.click('.maptog:has-text("Sessions on the map")')
    assert pg.locator('.spotlog-heat').count() == 0 and stored(pg)['settings']['mapSessions'] is False
    n_pins = pg.locator('.spotlog-pin').count()
    pg.click('.maptog:has-text("Spots on the map")')
    assert pg.locator('.spotlog-pin').count() == 0 and n_pins > 0
    pg.click('.maptog:has-text("Spots on the map")')
    pg.click('.maptog:has-text("Sessions on the map")')
    assert pg.locator('.spotlog-heat').count() > h0 and pg.locator('.spotlog-pin').count() == n_pins
    ok('hover a glow for dates and ratings; switches hide/show spots and sessions')
    tags = pg.locator('.tile .t-tag').all_inner_texts()
    assert tags and all(re.match(r'^(Good|Great|Epic) for \w', t) or t == 'Not sure yet' for t in tags), tags
    assert pg.locator('text=/Probably (flat|meh)/').count() == 0
    ok('tiles show the best stretch of today per sport ("Great for windsurf · 18:00") or "Not sure yet", never a negative guess: ' + ' | '.join(tags))
    pg.mouse.click(280, 585)
    pg.wait_for_selector('.act:has-text("Add spot")')
    pg.wait_for_selector('.snap .cells', timeout=8000)
    pg.click('.act:has-text("Add spot")')
    pg.fill('.field input', 'Secret reef')
    pg.click('.seg button:has-text("I don\'t know yet")')
    pg.click('text=Save spot')
    pg.wait_for_selector('text=Wind window: not known yet')
    shot('13-unknown-spot')
    ok('"I don\'t know yet" spot saved; suggestion pending')

    # --- phone: a compact bar in Windy's pane; pages open in a panel rising over the map (like The Buoy)
    pg.set_viewport_size({'width': 390, 'height': 844})
    pg.goto(URL.replace('index.html', 'index.html?m'))
    pg.wait_for_selector('#pane .spotlog.bar .mbar')
    h = pg.evaluate("document.querySelector('#pane .spotlog').getBoundingClientRect().height")
    assert 140 < h < 160, h
    shot('14-phone-bar')
    pg.click('.mtabs button:has-text("Spots")')
    pg.wait_for_selector('.mwrap.open .tile .wdir svg', timeout=8000)
    pg.wait_for_timeout(300)
    shot('14a-phone-panel')
    pg.click('.mtabs button:has-text("Spots")')
    pg.wait_for_timeout(300)
    assert pg.locator('.mwrap.open').count() == 0
    ok('phone: bar under the timeline, tabs open and close the panel over the map')
    pg.click('.mact:has-text("Save forecast")')
    pg.wait_for_selector('.mwrap.open .opt:has-text("Tap on the map")')
    pg.click('.opt:has-text("Tap on the map")')
    pg.wait_for_timeout(250)
    assert pg.locator('.mwrap.open').count() == 0
    pg.wait_for_selector('.mbar .mhint:has-text("Tap the map")')
    pg.mouse.click(200, 150)
    pg.wait_for_selector('.mwrap.open .btn.primary:has-text("Save forecast")', timeout=8000)
    shot('14b-phone-forecast')
    ok('phone: picking on the map moves the panel aside, the forecast opens in it')
    pg.click('.mclose')
    pg.wait_for_timeout(250)
    pg.locator('.spotlog-pin').first.click()
    pg.wait_for_selector('.mock-popup .sl-acts button:has-text("Log session")', timeout=5000)
    assert pg.locator('.mwrap.open').count() == 0, 'a spot tap shows the card, not the panel'
    pg.wait_for_timeout(300)
    shot('14c-phone-card')
    first = pg.locator('.mock-popup .sl-h b').inner_text()
    pg.click('.mock-popup .sl-nav button[data-act="next"]')
    pg.wait_for_function(f"document.querySelector('.mock-popup .sl-h b') && document.querySelector('.mock-popup .sl-h b').textContent !== {first!r}", timeout=5000)
    pg.click('.mock-popup .sl-acts button:has-text("Log session")')
    pg.wait_for_selector('.mwrap.open .ratings', timeout=5000)
    ok('phone: spot card on the map, next spot, Log session opens in the panel')
    # Log session on a phone: date, start and end on one line; the header stays put; nothing scrolls sideways
    pg.wait_for_timeout(300)
    tops = pg.evaluate("[...document.querySelectorAll('.mwrap.open .when.one > input, .mwrap.open .when.one .field-btn')].map(e => Math.round(e.getBoundingClientRect().top))")
    assert len(tops) == 3 and max(tops) - min(tops) <= 2, tops
    assert pg.locator('.mgrab').count() == 0, 'no drag line'
    pg.click('.mwrap.open .times .tw:last-child .field-btn')
    pg.wait_for_selector('.mwrap.open .tw-pop.end')
    pop = pg.evaluate("(() => { const p = document.querySelector('.mwrap.open .tw-pop').getBoundingClientRect(); const w = document.querySelector('.mwrap.open').getBoundingClientRect(); return [p.left - w.left, w.right - p.right]; })()")
    assert pop[0] >= 0 and pop[1] >= 0, pop
    shot('14d-phone-log-when')
    pg.click('.mwrap.open .tw-pop .done')
    sx = pg.evaluate("(() => { const b = document.querySelector('.mwrap.open .body'); return b.scrollWidth - b.clientWidth; })()")
    assert sx <= 0, f'the panel can scroll sideways by {sx}px'
    pg.evaluate("document.querySelector('.mwrap.open .body').scrollTop = 600")
    pg.wait_for_timeout(100)
    tb = pg.evaluate("(() => { const t = document.querySelector('.mwrap.open .topbar').getBoundingClientRect(); const w = document.querySelector('.mwrap.open').getBoundingClientRect(); return t.top - w.top; })()")
    assert abs(tb) < 2, tb
    shot('14e-phone-log-scrolled')
    ok('phone log: date/start/end on one line, header stays, no sideways scroll, only the inputs that teach')
    # the ✕ in the header closes the panel
    pg.click('.mwrap.open .topbar .mclose')
    pg.wait_for_timeout(250)
    assert pg.locator('.mwrap.open').count() == 0
    # units from the bar: their own page, with back and ✕
    pg.click('.mbar .units')
    pg.wait_for_selector('.mwrap.open.unitspage .topbar.upage:has-text("Units and data")')
    assert pg.locator('.mwrap.open .home-head:visible, .mwrap.open .tiles:visible').count() == 0
    pg.wait_for_timeout(250)
    # the units page: normal type like on desktop, nothing sticking out of the panel
    fw = pg.evaluate("[...document.querySelectorAll('.mwrap.open .set .lbl, .mwrap.open .set .chip:not(.on), .mwrap.open .set .toggle small')].map(e => getComputedStyle(e).fontWeight)")
    assert fw and all(x == '400' for x in fw), fw
    sx = pg.evaluate("(() => { const b = document.querySelector('.mwrap.open .body'); return b.scrollWidth - b.clientWidth; })()")
    assert sx <= 0, f'units page sticks out by {sx}px'
    sw = pg.evaluate("(() => { const s = document.querySelector('.mwrap.open .set .toggle .sw').getBoundingClientRect(); const w = document.querySelector('.mwrap.open').getBoundingClientRect(); return [s.right, w.right]; })()")
    assert sw[0] <= sw[1] - 8, sw
    shot('14f-phone-units')
    pg.click('.mwrap.open .topbar.upage .round')
    pg.wait_for_timeout(250)
    assert pg.locator('.mwrap.open').count() == 0, 'back from units opened from the bar closes the panel'
    pg.click('.mtabs button:has-text("Spots")')
    pg.wait_for_selector('.mwrap.open .topbar:has-text("Your spots")')
    pg.click('.mwrap.open .topbar .units')
    pg.wait_for_selector('.mwrap.open.unitspage')
    pg.click('.mwrap.open .topbar.upage .round')
    pg.wait_for_selector('.mwrap.open:not(.units) .tile')
    gap = pg.evaluate("(() => { const b = document.querySelector('.mtabs button .cnt'); return b.getBoundingClientRect().left - b.previousSibling?.parentElement.getBoundingClientRect().left; })()")
    pg.click('.mwrap.open .topbar .mclose')
    pg.wait_for_timeout(250)
    ok('phone: units open as their own page (back + ✕), tabs have a ✕ in the header')
    # Marker reconciliation preserves unchanged DOM nodes, so DOM order isn't diary order.
    # Centre the intended spot and address its name rather than whichever pin was inserted first.
    first_spot = stored(pg)['spots'][0]
    pg.evaluate('(s) => W.map.centerMap({lat: s.lat, lon: s.lon, zoom: W.map.map.getZoom()})', first_spot)
    pg.locator('.spotlog-pin').filter(has_text=first_spot['name']).first.click()
    pg.wait_for_selector('.mock-popup .sl-x', timeout=5000)
    z0 = pg.evaluate("W.map.map.getZoom()")
    pg.click('.mock-popup .sl-nav button[data-act="next"]')
    pg.wait_for_timeout(400)
    z1 = pg.evaluate("W.map.map.getZoom()")
    assert z1 == z0 or z0 < 7, (z0, z1)
    pg.click('.mock-popup .sl-x')
    pg.wait_for_timeout(300)
    assert pg.locator('.mock-popup').count() == 0, 'card closes with ✕'
    ok('phone: the spot card keeps your zoom from spot to spot and closes with ✕')
    # --- a touch phone: a tap types where you tapped, and nothing switches page by itself
    tctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, locale='en-GB', timezone_id='UTC', storage_state=ctx.storage_state())
    tp = tctx.new_page()
    tp.clock.install(time=TEST_TIME)
    tp.on('pageerror', lambda e: errors.append(str(e)))
    tp.goto(URL.replace('index.html', 'index.html?m'))
    tp.wait_for_selector('#pane .mbar')
    tp.tap('.mact:has-text("Log session")')
    tp.wait_for_selector('.mwrap.open .section .opt')
    tp.locator('.mwrap.open .section .opt').first.tap()
    tp.wait_for_selector('.mwrap.open .ratings', timeout=8000)
    tp.wait_for_timeout(400)
    title = lambda: tp.locator('.mwrap.open .topbar .title').inner_text()
    t0 = title()
    focused = lambda: tp.evaluate("(() => { const a = document.activeElement; return a ? (a.getAttribute('placeholder') || a.tagName) : ''; })()")
    def tap_type(loc, text, what):
        loc.scroll_into_view_if_needed()
        tp.wait_for_timeout(250)
        loc.tap()
        tp.wait_for_timeout(450)
        ph = loc.get_attribute('placeholder')
        assert focused() == ph, f'{what}: tapped it, but the cursor is in {focused()!r}'
        before = loc.input_value()
        tp.keyboard.type(text)
        tp.wait_for_timeout(150)
        assert loc.input_value() == before + text, f'{what}: typed {text!r}, field has {loc.input_value()!r}'
        assert tp.locator('.mwrap.open').count() == 1 and title() == t0, f'{what}: the page changed to {title()!r}'
    gear = tp.locator('.mwrap.open .field .row input').first
    notes = tp.locator('.mwrap.open textarea').first
    tap_type(gear, 'Sail 5.3', 'gear field')
    tap_type(notes, 'Clean and steady', 'notes')
    tap_type(gear, ' mast', 'gear field again')
    # chips and the rating still react to a tap after typing, and the page stays
    tp.locator('.mwrap.open .chip.notworth').first.tap()
    tp.wait_for_timeout(200)
    assert tp.locator('.mwrap.open .chip.notworth.on').count() == 1
    tp.locator('.mwrap.open .rate').nth(3).tap()
    tp.wait_for_timeout(200)
    assert tp.locator('.mwrap.open .chip.notworth.on').count() == 0 and tp.locator('.mwrap.open .rate.on').count() == 1
    assert title() == t0
    tp.screenshot(path=f'{OUT}/14g-phone-tap-type.png')
    # typing a new spot's name
    tp.tap('.mwrap.open .topbar .mclose')
    tp.wait_for_timeout(250)
    tp.tap('.mact:has-text("Add spot")')
    tp.wait_for_selector('.mwrap.open .opt')
    tp.tap('.mwrap.open .opt:has-text("Your current location")')
    tp.wait_for_selector('.mwrap.open .field input', timeout=8000)
    name = tp.locator('.mwrap.open .field input').first
    name.fill('')
    t0 = title()
    tap_type(name, 'Secret reef 2', 'spot name')
    tctx.close()
    ok('touch phone: every tap types in the field you tapped, chips and ratings react, the page never switches by itself')
    # a phone that cuts off anything above Windy's pane: Spotlog falls back to the classic panel under the timeline
    pg.goto(URL.replace('index.html', 'index.html?m'))
    pg.wait_for_selector('#pane .mbar')
    pg.evaluate("document.getElementById('pane').style.overflow = 'hidden'")
    pg.click('.mtabs button:has-text("Spots")')
    pg.wait_for_selector('#pane .spotlog.m:not(.bar) .home-head', timeout=5000)
    h = pg.evaluate("document.querySelector('#pane .spotlog').getBoundingClientRect().height")
    assert 380 < h < 460, h
    ok('phone: if the panel over the map would be cut off, the classic panel is used')
    data = stored(pg)
    b.close()

assert not any('fonts.googleapis' in u or 'fonts.gstatic' in u for u in requests), 'Google Fonts was requested'
print('✓ no requests to Google Fonts (fonts are bundled)')
print(json.dumps({
    'steps': len(steps),
    'spots': [(s['name'], s['dirs'], s['min'], s['max'], s.get('windUnknown')) for s in data['spots']],
    'sessions': [{k: s.get(k) for k in ('spotId', 'rating', 'sport', 'start', 'end', 'gearIds')} | {'track_km': s['track'] and round(s['track']['distanceKm'], 1)} for s in data['sessions']],
    'snapshots': len(data['snapshots']),
    'gear': [g['name'] for g in data['gear']],
    'settings': data['settings'],
    'errors': errors,
}, indent=1))
