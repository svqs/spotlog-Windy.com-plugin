"""Learning counts in the compiled UI, synthetic diaries only.
Run node scripts/test-learning-scenarios.mjs first; serve the repository on :8765.
"""
import datetime
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

FIXTURES = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/spotlog-learning')
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else '/tmp/spotlog-learning-browser')
OUT.mkdir(parents=True, exist_ok=True)
URL = 'http://localhost:8765/harness/index.html'
KEY = 'windy-plugin-spotlog:v1:u12345'
RESULTS = []

def stored(pg):
    return pg.evaluate('(key) => JSON.parse(localStorage.getItem(key))', KEY)

def seed(pg, data):
    # Seed on a page without the plugin, so a running tab cannot merge the previous fixture back in.
    pg.goto('http://localhost:8765/')
    pg.evaluate('localStorage.clear()')
    pg.evaluate('([key, data]) => localStorage.setItem(key, JSON.stringify(data))', [KEY, data])
    pg.goto(URL)
    pg.wait_for_selector('.spotlog')

def open_spot(pg):
    if not pg.locator('.tile').first.is_visible() and pg.locator('.mtabs').count():
        pg.locator('.mtabs button').filter(has_text='Spots').click()
    pg.locator('.tile').first.click()
    if pg.viewport_size['width'] < 760:
        pg.locator('.sl-acts button[data-act="open"]').click()
        # since 0.18.4 Details closes the card by itself (no ✕ to tap): wait until it's gone
        pg.wait_for_selector('.spotlog-popup', state='detached')
    pg.wait_for_selector('.works-sec')

def summary(pg, outings, great):
    pg.locator('.w-head').first.scroll_into_view_if_needed()
    expect(pg.locator('.w-head .grow').first).to_be_visible()
    # the counts are checked in scripts/test-learning-scenarios.mjs; on screen the line stays general (0.18.4)
    expect(pg.locator('.w-head .grow').first).to_have_text('learned from your logged sessions')

def time_wheel(pg, index, hour):
    wheel = pg.locator('.tw').nth(index)
    wheel.locator('.field-btn').click()
    wheel.locator('.col').first.get_by_role('button', name=f'{hour:02}', exact=True).click()
    wheel.locator('.col').nth(1).get_by_role('button', name='00', exact=True).click()
    # Wait for the smooth wheel scroll and its debounced commit before closing it.
    expect(wheel.locator('.field-btn')).to_have_text(f'{hour:02}:00')
    wheel.locator('.done').click()

with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in [1440, 390]:
        for fixture, n, g in [('four-valid', 4, 2), ('four-one-late', 3, 1), ('long-term', 600, 300)]:
            context = browser.new_context(viewport={'width': width, 'height': 900}, timezone_id='UTC', locale='en-GB')
            pg = context.new_page()
            pg.clock.install(time=datetime.datetime(2024, 1, 1, 12, tzinfo=datetime.timezone.utc))
            errors = []
            pg.on('pageerror', lambda error: errors.append(str(error)))
            data = json.loads((FIXTURES / f'{fixture}.json').read_text())
            seed(pg, data)
            open_spot(pg)
            summary(pg, n, g)
            assert len(stored(pg)['sessions']) == len(data['sessions'])
            pg.screenshot(animations='disabled', path=str(OUT / f'{width}-{fixture}.png'))
            pg.reload()
            open_spot(pg)
            summary(pg, n, g)
            RESULTS.append({'viewport': width, 'scenario': fixture, 'stored': len(data['sessions']), 'learned': n, 'great': g, 'reload': 'pass'})
            assert not errors, errors
            context.close()

    # Log four outings through the real form, explicitly reusing the saved forecast.
    context = browser.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='UTC', locale='en-GB')
    pg = context.new_page()
    pg.clock.install(time=datetime.datetime(2024, 1, 1, 12, tzinfo=datetime.timezone.utc))
    errors = []
    pg.on('pageerror', lambda error: errors.append(str(error)))
    data = json.loads((FIXTURES / 'four-valid.json').read_text())
    data['sessions'] = []
    seed(pg, data)
    for k, rating in enumerate(['good', 'great', 'good', 'epic']):
        pg.locator('.act').filter(has_text='Log session').click()
        pg.get_by_role('button').filter(has_text='Your last saved forecast').click()
        pg.wait_for_selector('.ratings')
        time_wheel(pg, 0, 8 + k * 2)
        time_wheel(pg, 1, 9 + k * 2)
        pg.locator('.rate').filter(has_text=rating).click()
        pg.get_by_role('button', name='Save session', exact=True).click()
        pg.wait_for_selector('.works-sec')
        assert len(stored(pg)['sessions']) == k + 1
        assert all(session['snapshotId'] == 'shared' for session in stored(pg)['sessions'])
        assert stored(pg)['sessions'][-1]['start'] == f'{8 + k * 2:02}:00'
        assert stored(pg)['sessions'][-1]['end'] == f'{9 + k * 2:02}:00'
        summary(pg, k + 1, [0, 1, 1, 2][k])
        pg.get_by_role('button', name='Back', exact=True).click()
        pg.wait_for_selector('.tile')
    open_spot(pg)
    summary(pg, 4, 2)
    pg.screenshot(animations='disabled', path=str(OUT / 'four-form-saves.png'))
    RESULTS.append({'scenario': 'four real form saves with last saved forecast', 'stored': 4, 'learned': 4, 'great': 2})

    # The spot's Log session action uses only an UNUSED forecast; a shared one is not reused.
    data = json.loads((FIXTURES / 'four-valid.json').read_text())
    data['sessions'] = data['sessions'][:3]
    seed(pg, data)
    open_spot(pg)
    summary(pg, 3, 1)
    pg.locator('.act').filter(has_text='Log session').click()
    pg.wait_for_selector('.ratings')
    pg.wait_for_function('(key) => JSON.parse(localStorage.getItem(key)).snapshots.length > 1', arg=KEY)
    time_wheel(pg, 0, 10)
    time_wheel(pg, 1, 11)
    pg.locator('.rate').filter(has_text='epic').click()
    expect(pg.get_by_text("This forecast was saved after you started, so it stays in your diary but doesn't teach spotlog. Save it before you go next time.", exact=True)).to_be_visible()
    pg.screenshot(animations='disabled', path=str(OUT / 'spot-action-late-warning.png'))
    pg.get_by_role('button', name='Save session', exact=True).click()
    pg.wait_for_selector('.works-sec')
    summary(pg, 3, 1)
    result = stored(pg)
    assert len(result['sessions']) == 4
    newest = result['sessions'][-1]
    assert newest['start'] == '10:00' and newest['end'] == '11:00'
    snapshot = next(item for item in result['snapshots'] if item['id'] == newest['snapshotId'])
    assert snapshot['savedAt'] > newest['date'] and newest['snapshotId'] != 'shared'
    pg.screenshot(animations='disabled', path=str(OUT / 'spot-action-three-of-four.png'))
    RESULTS.append({'scenario': 'spot action recaptures instead of reusing a used forecast', 'stored': 4, 'learned': 3, 'great': 1, 'late_warning': 'visible'})
    assert not errors, errors
    context.close()
    (OUT / 'results.json').write_text(json.dumps({'browser': browser.version, 'scenarios': RESULTS}, indent=2) + '\n')
    browser.close()
print(f'{len(RESULTS)} browser learning scenarios passed; {OUT}', flush=True)
