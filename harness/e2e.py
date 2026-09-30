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
    pg.on('console', lambda m: errors.append('console.' + m.type + ': ' + m.text) if m.type == 'error' and 'ERR_TUNNEL' not in m.text else None)
    pg.goto(URL)
    pg.evaluate('localStorage.clear()')
    pg.reload()
    pg.wait_for_selector('.spotlog')
    shot = lambda n: pg.screenshot(path=f'{OUT}/{n}.png')
    pane = pg.locator('#pane')
    bottom = lambda: pane.evaluate('el => el.scrollTo(0, el.scrollHeight)')
    top = lambda: pane.evaluate('el => el.scrollTo(0, 0)')
    shot('01-home-empty')

    # --- Add spot from home: pick on the map, "I know" the wind
    pg.click('.act:has-text("Add spot")')
    pg.wait_for_selector('text=Click the map')
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
    pg.fill('textarea', 'Gusty inside until 3 pm, then clean.')
    bottom()
    pg.click('text=Save session')
    pg.wait_for_selector('text=Sessions here')
    se = stored(pg)['sessions'][0]
    assert se['rating'] == 5 and se['track'] and se['gearIds'], se
    ok('session saved with rating, felt, gear and track')

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
    pg.click('.chip:has-text("Board")')
    pg.fill('.card input', 'Freewave 105 L')
    pg.click('.card .btn:has-text("Add")')
    pg.wait_for_selector('.item:has-text("Freewave 105 L")')
    shot('11-gear')
    ok('gear tab adds gear')

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

print(json.dumps({
    'steps': len(steps),
    'spots': [(s['name'], s['dirs'], s['min'], s['max'], s.get('windUnknown')) for s in data['spots']],
    'sessions': [{k: s.get(k) for k in ('spotId', 'rating', 'felt', 'gusts', 'water', 'start', 'end', 'gearIds')} | {'track_km': s['track'] and round(s['track']['distanceKm'], 1)} for s in data['sessions']],
    'snapshots': len(data['snapshots']),
    'gear': [g['name'] for g in data['gear']],
    'settings': data['settings'],
    'errors': errors,
}, indent=1))
