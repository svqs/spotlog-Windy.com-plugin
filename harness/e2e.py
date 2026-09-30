"""End-to-end check of the compiled Spotlog plugin (v0.2) inside the fake-Windy harness.

Run:  python3 -m http.server 8765  (from the project root), then  python3 harness/e2e.py <screenshot dir>
"""
import json, sys, os
from playwright.sync_api import sync_playwright

URL = 'http://localhost:8765/harness/index.html'
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
GPX = os.path.join(os.path.dirname(__file__), 'session.gpx')
errors, steps = [], []


def ok(msg):
    steps.append(msg)
    print('✓', msg, flush=True)


def stored(pg):
    return pg.evaluate("JSON.parse(localStorage.getItem('windy-plugin-spotlog:v1') || '{}')")


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
    shot('03-spot')

    # --- Save forecast + undo
    pg.click('.act:has-text("Save forecast")')
    pg.wait_for_selector('.toast:has-text("Forecast saved")', timeout=8000)
    assert len(stored(pg)['snapshots']) == 1
    pg.click('.toast .undo')
    pg.wait_for_timeout(200)
    assert len(stored(pg)['snapshots']) == 0
    ok('save forecast then undo removes it')
    pg.click('.act:has-text("Save forecast")')
    pg.wait_for_selector('.toast:has-text("Forecast saved")', timeout=8000)
    pg.wait_for_selector('.mini:has-text("Edit")')
    ok('saved forecast row has Edit + Delete')

    # --- Show on map -> popup with current conditions
    pg.click('.act:has-text("Show on map")')
    pg.wait_for_selector('.mock-popup .sl-pop', timeout=5000)
    ok('show on map opens a popup with current conditions')
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
    ok(f'GPX track attached, drawn on map, start time filled ({start_txt})')
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
    pg.wait_for_selector('.snap:has-text("Forecast for your session time")', timeout=5000)
    ok('snapshot card follows the session time (whole day saved)')
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
    ok(f'saved forecast moved to the session time ({hr}:00) and keeps the whole day')

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

    # --- home: Save forecast at the map centre -> snapshot view, link to spot, delete
    pg.click('.act:has-text("Save forecast")')
    pg.wait_for_selector('text=Map centre')
    pg.click('.item:has-text("Map centre")')
    pg.wait_for_selector('text=Saved forecast', timeout=8000)
    pg.wait_for_selector('.toast:has-text("Undo")')
    shot('09-snapshot-view')
    # the map is centred on the spot after "Show on map", so the forecast links itself; otherwise link it by hand
    if pg.locator('text=Unlink').count() == 0:
        pg.click('.chip:has-text("Valdevaqueros")')
    pg.wait_for_selector('text=Unlink')
    ok('forecast from home at map centre, linked to the spot')
    ts0 = stored(pg)['snapshots'][-1]['ts']
    pg.locator('.hours .hr').nth(3).click()
    pg.wait_for_timeout(200)
    assert stored(pg)['snapshots'][-1]['ts'] != ts0
    ok('hour strip changes the saved forecast hour')
    pg.fill('textarea', 'Maybe after work')
    pg.locator('textarea').blur()
    pg.click('.btn.ghost:has-text("Delete")')
    pg.wait_for_selector('.toast:has-text("Forecast deleted")')

    # --- log a session without a place, add the spot later
    top()
    if pg.locator('button[aria-label="Back"]').count():
        pg.click('button[aria-label="Back"]')
    pg.wait_for_selector('.act:has-text("Log session")')
    pg.click('.act:has-text("Log session")')
    pg.click('.item:has-text("Without a place")')
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
    pg.fill('.card input', "6' comp")
    pg.click('.card .btn:has-text("Add")')
    pg.wait_for_selector('.item:has-text("comp")')
    g = [x for x in stored(pg)['gear'] if x['name'] == "6' comp"][0]
    assert g['sport'] == 'Surf' and g['kind'] == 'Leash', g
    shot('11-gear')
    ok('gear tab: sport first, then sport-specific kinds')

    # --- account sync (fake backend in the harness, code 123456)
    pg.click('.tabs button:has-text("Data")')
    pg.fill('input[type=email]', 'sophia@example.com')
    pg.click('.btn:has-text("Send code")')
    pg.fill('input[autocomplete=one-time-code]', '123456')
    pg.click('.btn:has-text("Sign in")')
    pg.wait_for_selector('.toast:has-text("Signed in")', timeout=5000)
    cloud = pg.evaluate("JSON.parse(localStorage.getItem('spotlog-mock-cloud'))")
    row = list(cloud['rows'].values())[0]
    assert len(row['data']['sessions']) >= 1, row
    shot('11b-account')
    ok('sign in with email code, diary uploaded to the account')

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
    row = list(cloud['rows'].values())[0]
    assert 'Tab one sail' not in [g['name'] for g in row['data']['gear']]
    assert any(v for v in row['data'].get('deleted', {}).values())
    ok('a delete syncs to the account and is remembered')

    # --- delete my data from the account
    pg.click('.tabs button:has-text("Data")')
    pg.click('text=Delete my data from the account')
    pg.click('text=Tap again: deletes your diary from the account')
    pg.wait_for_selector('.toast:has-text("deleted from the account")')
    cloud = pg.evaluate("JSON.parse(localStorage.getItem('spotlog-mock-cloud'))")
    assert not cloud.get('rows'), cloud.get('rows')
    ok('delete my data from the account')

    # --- a spot where you don't know the wind yet (click on the empty map)
    pg.click('.tabs button:has-text("Spots")')
    pg.mouse.click(260, 560)
    pg.wait_for_selector('text=Add spot')
    pg.wait_for_selector('.snap .cells', timeout=8000)
    shot('12-place')
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
    pg.wait_for_selector('.spotlog')
    pg.wait_for_timeout(900)
    pane.screenshot(path=f'{OUT}/14-phone-home.png')
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
