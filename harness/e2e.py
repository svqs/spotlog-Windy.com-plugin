"""End-to-end check of the compiled Spotlog plugin (v0.2) inside the fake-Windy harness.

Run:  python3 -m http.server 8765  (from the project root), then  python3 harness/e2e.py <screenshot dir>
"""
import json, sys, os
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8765/harness/index.html'
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
GPX = os.path.join(os.path.dirname(__file__), 'session.gpx')
# the track must be from today (Windy only has forecasts from today on): regenerate it for every run
import subprocess, tempfile
GPX = os.path.join(tempfile.gettempdir(), 'spotlog-session.gpx')
subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'make_gpx.py'), GPX], check=True, capture_output=True)
errors, steps = [], []


def ok(msg):
    steps.append(msg)
    print('✓', msg, flush=True)


def stored(pg):
    return pg.evaluate("JSON.parse(localStorage.getItem('windy-plugin-spotlog:v1:u12345') || localStorage.getItem('windy-plugin-spotlog:v1') || '{}')")


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, locale='en-GB')
    pg = ctx.new_page()
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
    pg.wait_for_selector('text=Which wind works here?')
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

    # --- Save forecast: preview first, nothing stored until "Save forecast"; then undo
    pg.click('.act:has-text("Save forecast")')
    pg.wait_for_selector('.snap:has-text("Not saved yet")', timeout=8000)
    assert len(stored(pg).get('snapshots', [])) == 0
    assert pg.locator('text=Log a session with this').count() == 0
    shot('03b-forecast-preview')
    pg.click('.btn.primary:has-text("Save forecast")')
    pg.wait_for_selector('.toast:has-text("Forecast saved")', timeout=8000)
    assert len(stored(pg)['snapshots']) == 1
    s0 = stored(pg)['snapshots'][0]
    import datetime as _dt0
    now_h = _dt0.datetime.now().replace(minute=0, second=0, microsecond=0).timestamp() * 1000
    assert s0['series']['ts'][0] == now_h and len(s0['series']['ts']) == 25, (s0['series']['ts'][0], now_h, len(s0['series']['ts']))
    ok('save forecast: preview, then save; keeps now + the next 24 hours')
    pg.click('.toast .undo')
    pg.wait_for_timeout(200)
    assert len(stored(pg)['snapshots']) == 0
    ok('undo removes a just-saved forecast')
    pg.click('.act:has-text("Save forecast")')
    pg.wait_for_selector('.btn.primary:has-text("Save forecast")', timeout=8000)
    pg.click('.btn.primary:has-text("Save forecast")')
    pg.wait_for_selector('.mini:has-text("Edit")')
    ok('saved forecast row has Edit + Delete')

    # --- Show on map -> popup with current conditions
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

    # --- Log a session: rating, magnetic slider drag, gear, time wheel, GPX
    pg.click('.act:has-text("Log session")')
    pg.wait_for_selector('.felt')
    pg.click('.rate:has-text("epic")')
    pg.locator('.felt').scroll_into_view_if_needed()
    box = pg.locator('.felt').bounding_box()
    start_v = int(pg.get_attribute('.felt', 'aria-valuenow'))
    cx, cy = box['x'] + box['width'] / 2, box['y'] + 36
    pg.mouse.move(cx, cy)
    pg.mouse.down()
    for i in range(1, 11):  # slow drag of the whole ruler to the right = lighter wind (2.3 ticks)
        pg.mouse.move(cx + i * 3.7, cy)
        pg.wait_for_timeout(25)
    pg.wait_for_timeout(120)
    pg.mouse.up()
    pg.wait_for_timeout(450)
    felt = int(pg.get_attribute('.felt', 'aria-valuenow'))
    assert felt == start_v - 2, (start_v, felt)
    ok(f'felt ruler drags with the mouse and snaps to a whole value ({start_v} -> {felt} m/s)')
    pg.locator('.felt').focus()
    pg.keyboard.press('ArrowRight')
    assert int(pg.get_attribute('.felt', 'aria-valuenow')) == felt + 1
    pg.keyboard.press('ArrowLeft')
    ok('felt ruler works with arrow keys')
    pg.click('.chip:has-text("Gusty") >> nth=0')
    pg.click('.chip:has-text("Chop")')
    pg.fill('input[placeholder^="e.g. Sail"]', 'Sail 5.3')
    pg.click('text=Save to gear')
    pg.wait_for_selector('.chip.on:has-text("Sail 5.3")')
    ok('typed gear saved to gear list and selected')
    pg.set_input_files('input[type=file][accept^=".gpx"]', GPX)
    pg.wait_for_selector('text=Top speed', timeout=5000)
    pg.wait_for_selector('.mock-line polyline')
    start_txt = pg.locator('.tw .field-btn >> nth=0').inner_text()
    assert pg.locator('.mock-line [stroke="#ff3d8b"]').count() >= 1, 'route is not the thin pink line'
    ok(f'GPX track attached, drawn on map as a thin pink line, start time filled ({start_txt})')
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
    # a normal mouse-wheel scroll over the ruler scrolls the panel instead of getting stuck
    pg.locator('.felt').scroll_into_view_if_needed()
    fb = pg.locator('.felt').bounding_box()
    before_scroll = pane.evaluate('el => el.scrollTop')
    felt_before = pg.get_attribute('.felt', 'aria-valuenow')
    pg.mouse.move(fb['x'] + fb['width'] / 2, fb['y'] + 30)
    pg.mouse.wheel(0, 300)
    pg.wait_for_timeout(300)
    assert pane.evaluate('el => el.scrollTop') > before_scroll, 'panel did not scroll over the ruler'
    assert pg.get_attribute('.felt', 'aria-valuenow') == felt_before
    ok('scrolling over the ruler scrolls the page')
    pg.fill('textarea', 'Gusty inside until 3 pm, then clean.')
    bottom()
    pg.click('text=Save session')
    pg.wait_for_selector('text=Sessions here')
    se = stored(pg)['sessions'][0]
    assert se['rating'] == 5 and se['track'] and se['gearIds'], se
    ok('session saved with rating, felt, gear and track')
    sd = stored(pg)
    sn = next(x for x in sd['snapshots'] if x['id'] == se['snapshotId'])
    import datetime as _dt
    hr = _dt.datetime.fromtimestamp(sn['ts'] / 1000).hour
    assert sn.get('series') and hr in (15, 16), (hr, bool(sn.get('series')))
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
    pg.click('.sw .del >> nth=0')
    pg.wait_for_selector('.toast:has-text("Session deleted")')
    assert len(stored(pg)['sessions']) == 0
    pg.click('.toast .undo')
    pg.wait_for_timeout(200)
    assert len(stored(pg)['sessions']) == 1
    ok('swipe left reveals delete, undo brings it back')

    # --- home: tiles show current conditions; units switch to knots
    top()
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

    # --- home: Save forecast at the map centre -> snapshot view, link to spot, delete
    pg.click('.act:has-text("Save forecast")')
    pg.wait_for_selector('text=Map centre')
    pg.click('.opt:has-text("Map centre")')
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
        pg.wait_for_selector('.toast:has-text("Forecast replaced")')
        assert len(stored(pg)['snapshots']) == n0
    else:
        pg.wait_for_selector('.toast:has-text("Forecast saved")')
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
    pg.wait_for_selector('.toast:has-text("Forecast replaced")')
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
    pg.wait_for_selector('.felt')
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
    assert pg.locator('.coffee').count() == 0, 'coffee link only on About'
    pg.click('.tabs button:has-text("About")')
    pg.wait_for_selector('text=How it works')
    pg.wait_for_selector('.sig .coffee')
    shot('11b-about')
    ok('About tab: friendly how-to, coffee link only there')

    # --- two Windy tabs open at once must not overwrite each other
    pg2 = ctx.new_page()
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

    # --- Premium gate: logged out / not Premium
    pg.evaluate("W.store.set('subscription', null)")
    pg.wait_for_selector('b:has-text("is part of Windy Premium")')
    pg.evaluate("W.store.set('user', null)")
    pg.wait_for_selector('b:has-text("Log in to Windy to use")')
    shot('11c-gate')
    pg.evaluate("W.store.set('user', { id: 12345, username: 'sophia', email: 'sophia@example.com' }); W.store.set('subscription', 'premium')")
    pg.wait_for_selector('.act:has-text("Save forecast")')
    ok('only logged-in Premium users get in; the diary comes back after logging in again')

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
    pg.wait_for_selector('.felt')
    bottom()
    pg.click('text=Save session')
    pg.wait_for_function(f"document.querySelectorAll('.spotlog-heat').length > {h0}")
    ok('sessions show as a glow on the map, one per place')
    # hover shows the dates; the switches hide and show spots and sessions
    top()
    pg.click('.tabs button:has-text("Spots")')
    heat = pg.locator('.spotlog-heat').last  # the one just logged, in view
    heat.hover()
    pg.wait_for_selector('.spotlog-tip:visible')
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
    assert pg.locator('.tile .tag.ghost:has-text("Rating soon")').count() >= 1
    ok('tiles without enough sessions say "Rating soon"')
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

    # --- phone width
    pg.set_viewport_size({'width': 390, 'height': 844})
    pg.goto(URL.replace('index.html', 'index.html?m'))
    # default on phones: the classic panel under the timeline (as in 0.6), half the screen high
    pg.wait_for_selector('#pane .spotlog.m .head')
    h = pg.evaluate("document.querySelector('#pane .spotlog').getBoundingClientRect().height")
    assert 380 < h < 460, h
    shot('14a-phone-classic')
    ok('phone: classic panel under the timeline by default')
    # the new layout is a switch in About
    pg.click('#pane .tabs button:has-text("About")')
    pg.click('.maptog:has-text("New phone layout")')
    pg.wait_for_selector('#pane .mbar')
    pg.click('.sheet-x')
    pg.wait_for_timeout(600)
    # phones: a slim bar in Windy's pane; the panel is a sheet on the page, closed at first
    assert pg.locator('body > .spotlog.sheet').count() == 1 and pg.locator('.spotlog.sheet.open').count() == 0
    shot('14-phone-bar')
    pg.click('.mtabs button:has-text("Spots")')
    pg.wait_for_selector('.spotlog.sheet.open .tile')
    pg.wait_for_timeout(350)
    shot('14b-phone-sheet')
    assert pg.locator('.tile .wdir svg').count() >= 1, 'tiles show a wind arrow'
    pg.click('.sheet-x')
    pg.wait_for_timeout(300)
    assert pg.locator('.spotlog.sheet.open').count() == 0
    ok('phone: bar under the timeline, tabs open the sheet, ✕ closes it')
    pg.click('.mact:has-text("Save forecast")')
    pg.wait_for_selector('.spotlog.sheet.open .opt:has-text("Tap on the map")')
    pg.click('.opt:has-text("Tap on the map")')
    pg.wait_for_timeout(300)
    assert pg.locator('.spotlog.sheet.open').count() == 0
    pg.wait_for_selector('.mbar .mhint:has-text("Tap the map")')
    shot('14c-phone-tap-map')
    pg.mouse.click(200, 200)
    pg.wait_for_selector('.spotlog.sheet.open .btn.primary:has-text("Save forecast")', timeout=8000)
    shot('14d-phone-forecast')
    ok('phone: picking on the map moves the sheet aside, then the forecast opens in it')
    data = stored(pg)
    b.close()

assert not any('fonts.googleapis' in u or 'fonts.gstatic' in u for u in requests), 'Google Fonts was requested'
print('✓ no requests to Google Fonts (fonts are bundled)')
print(json.dumps({
    'steps': len(steps),
    'spots': [(s['name'], s['dirs'], s['min'], s['max'], s.get('windUnknown')) for s in data['spots']],
    'sessions': [{k: s.get(k) for k in ('spotId', 'rating', 'felt', 'gusts', 'water', 'start', 'end', 'gearIds')} | {'track_km': s['track'] and round(s['track']['distanceKm'], 1)} for s in data['sessions']],
    'snapshots': len(data['snapshots']),
    'gear': [g['name'] for g in data['gear']],
    'settings': data['settings'],
    'errors': errors,
}, indent=1))
