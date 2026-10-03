"""Scenario tests beyond the e2e: data sizes, old/odd data, viewports, units, time zones, the window learning.

Run:  python3 -m http.server 8765  (from the project root), then  python3 harness/scenarios.py <screenshot dir>
"""
import json, sys, time, random, math
from playwright.sync_api import sync_playwright
URL = 'http://localhost:8765/harness/index.html'
OUT = sys.argv[1]
KEY = 'windy-plugin-spotlog:v1:u12345'
findings = []
def note(ok, msg):
    print(('✓ ' if ok else '✗ ') + msg, flush=True)
    if not ok: findings.append(msg)

def big_data(n_spots=30, n_sessions=500, n_snaps=200, legacy=False):
    random.seed(4)
    now = int(time.time() * 1000)
    spots = [{'id': f'sp{i}', 'name': f'Spot {i} ' + ('with a really long name for testing' if i == 3 else ''), 'lat': 36.0 + random.uniform(-0.6, 0.6), 'lon': -5.6 + random.uniform(-0.8, 0.8),
              'place': 'Tarifa', 'sports': ['Windsurf'], 'dirs': ['E', 'SE'] if i % 2 else ['W'], 'min': 6, 'max': 12, 'created': now - 86400e3 * 60} for i in range(n_spots)]
    snaps = []
    for i in range(n_snaps):
        ts = now - int(random.uniform(0, 300)) * 86400000
        grid = [ts - (ts % 3600000) + h * 3600000 for h in range(25)]
        models = {m: {'wind': [round(random.uniform(3, 14), 1) for _ in grid], 'gust': [round(random.uniform(5, 18), 1) for _ in grid], 'dir': [random.choice([90, 100, 270, 280]) for _ in grid], 'temp': [20.0 for _ in grid]} for m in ['ecmwf', 'gfs', 'icon', 'iconEu']}
        sp = spots[i % n_spots]
        snaps.append({'id': f'sn{i}', 'spotId': sp['id'], 'lat': sp['lat'], 'lon': sp['lon'], 'ts': ts, 'savedAt': ts, 'primary': 'ecmwf',
                      'models': [{'model': m, 'ts': ts, 'wind': v['wind'][0], 'gust': v['gust'][0], 'dir': v['dir'][0], 'temp': 20} for m, v in models.items()],
                      'waves': {'model': 'ecmwfWaves', 'waves': 0.8, 'wavesPeriod': 6, 'wavesPower': 1, 'wavesDir': 90, 'swell1': 0.4, 'swell1Period': 8, 'swell1Dir': 250},
                      'series': {'ts': grid, 'models': models, 'waves': {'model': 'ecmwfWaves', **{k: [0.8] * 25 for k in ['waves', 'wavesPeriod', 'wavesPower', 'wavesDir', 'swell1', 'swell1Period', 'swell1Dir']}}}})
    sessions = []
    for i in range(n_sessions):
        sn = snaps[i % n_snaps] if i % 3 else None
        sp = spots[i % n_spots]
        d = (sn['ts'] if sn else now - int(random.uniform(0, 400)) * 86400000)
        s = {'id': f'se{i}', 'spotId': sp['id'], 'snapshotId': sn['id'] if sn else None, 'date': d, 'rating': random.randint(1, 5), 'felt': round(random.uniform(4, 13), 1),
             'gusts': random.choice([None, 'Steady', 'Gusty']), 'water': random.choice([None, 'Flat', 'Chop']), 'gearIds': [], 'gear': '', 'start': '14:00', 'end': '16:30', 'notes': 'n' * random.randint(0, 200)}
        if not legacy: s.update({'tide': random.choice([None, 'Low', 'High']), 'tideMove': random.choice([None, 'Rising'])})
        sessions.append(s)
    d = {'version': 1, 'spots': spots, 'snapshots': snaps, 'sessions': sessions, 'gear': [{'id': 'g1', 'name': 'Board 105', 'kind': 'Board'}], 'settings': {'wind': 'ms', 'height': 'm', 'temp': 'C'}}
    if not legacy: d['settings']['welcomed'] = True
    return d

def text_problems(pg):
    t = pg.locator('.spotlog').first.inner_text()
    return [w for w in ['NaN', 'undefined', 'null', '[object', 'Infinity'] if w in t]

def overflow(pg):
    return pg.evaluate("""() => {
      const root = document.querySelector('.spotlog'); if (!root) return ['no root'];
      const rr = root.getBoundingClientRect(); const bad = [];
      for (const el of root.querySelectorAll('*')) {
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.position === 'fixed') continue;
        if (el.closest('.swipe-actions,.sw .back,.tw-pop,[hidden],.cells,.scrollx,.trust,.hours')) continue;
        if (r.right > rr.right + 1.5 || r.left < rr.left - 1.5) bad.push((el.className && el.className.baseVal === undefined ? el.className : el.tagName) + ' ' + (el.textContent || '').trim().slice(0, 30));
      }
      return [...new Set(bad)].slice(0, 6);
    }""")

with sync_playwright() as p:
    b = p.chromium.launch()
    def page(vp=(1440, 900), tz=None, locale='en-GB', mobile=False, touch=False):
        ctx = b.new_context(viewport={'width': vp[0], 'height': vp[1]}, timezone_id=tz, locale=locale, has_touch=touch, is_mobile=mobile)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'ERR_TUNNEL' not in m.text else None)
        return ctx, pg, errs
    def seed(pg, d, url=URL):
        pg.goto(url); pg.evaluate('localStorage.clear()')
        if d is not None: pg.evaluate("([k, d]) => localStorage.setItem(k, typeof d === 'string' ? d : JSON.stringify(d))", [KEY, d])
        t0 = time.time(); pg.reload(); pg.wait_for_selector('.spotlog'); return t0



    # 1. big diary: 30 spots, 500 sessions, 200 saved days
    d = big_data()
    size = len(json.dumps(d))
    ctx, pg, errs = page()
    t0 = seed(pg, d)
    pg.wait_for_function("document.querySelectorAll('.tile .t-tag .tag:not(.ghost), .tile .t-tag .tag.ghost').length >= 30", timeout=20000)
    pg.wait_for_function("!document.querySelector('.tile .now small') || ![...document.querySelectorAll('.tile .now small')].some(x => x.textContent.includes('Loading'))", timeout=20000)
    t_tiles = time.time() - t0
    note(t_tiles < 8, f'big diary ({size/1e6:.1f} MB: 30 spots, 500 sessions, 200 saved days): tiles with guesses in {t_tiles:.1f}s')
    t = pg.evaluate("() => { const t = performance.now(); for (let i = 0; i < 20; i++) window.dispatchEvent(new Event('resize')); return performance.now() - t; }")
    pg.click('.tabs button:has-text("Sessions")'); t1 = time.time(); pg.wait_for_selector('.sw .front'); 
    note(time.time() - t1 < 2, f'Sessions tab with 500 sessions opens in {time.time()-t1:.2f}s')
    pg.click('.tabs button:has-text("Spots")'); pg.click('.tile >> nth=1'); t1 = time.time(); pg.wait_for_selector('.reco'); 
    note(time.time() - t1 < 2, f'spot page with ~17 sessions opens in {time.time()-t1:.2f}s; best today: ' + pg.locator('.reco').inner_text().replace('\n', ' '))
    pg.screenshot(path=f'{OUT}/big-spot.png')
    tags = pg.evaluate("[...document.querySelectorAll('.spotlog-pin em')].map(e => e.textContent)")
    note(not any(x.startswith(('flat', 'meh')) for x in tags), f'map pins only good words: {sorted(set(tags))[:6]}')
    note(not text_problems(pg), f'no NaN/undefined text {text_problems(pg)}')
    note(not errs, f'no errors with the big diary {errs[:3]}')
    stored_size = pg.evaluate(f"(localStorage.getItem('{KEY}') || '').length")
    note(True, f'stored size {stored_size/1e6:.2f} MB of a ~5 MB browser allowance')
    ctx.close()

    # 2. old diary (before 0.11/0.12: no welcome mark, no tide) and broken bits
    ctx, pg, errs = page()
    d = big_data(3, 12, 6, legacy=True)
    d['sessions'].append({'id': 'bad1', 'spotId': 'sp0', 'rating': 'x', 'date': 'yesterday'})
    d['spots'].append({'id': 'bad2', 'name': 'No coords'})
    d['snapshots'].append({'id': 'bad3', 'lat': 1, 'lon': 2, 'models': 'nope'})
    seed(pg, d)
    pg.wait_for_selector('.tile')
    note(pg.locator('.welcome').count() == 0, 'old diary: no welcome (has data)')
    note(pg.locator('.tile').count() == 3, f'spot without coordinates is skipped ({pg.locator(".tile").count()} tiles)')
    note(not errs, f'old/odd data loads without errors {errs[:3]}')
    ctx.close()
    ctx, pg, errs = page()
    seed(pg, '{not json')
    note(pg.locator('.welcome').count() == 1 and not [e for e in errs if 'spotlog' not in e.lower()], f'broken storage: starts fresh with the welcome {errs[:2]}')
    ctx.close()

    # 3. viewports (phone ones in the phone layout), every tab, overflow + odd text
    small = big_data(4, 20, 8)
    for vp, mob in [((320, 568), True), ((390, 844), True), ((430, 932), True), ((768, 1024), False), ((1280, 720), False), ((1920, 1080), False)]:
        ctx, pg, errs = page(vp, mobile=mob, touch=mob)
        url = URL.replace('index.html', 'index.html?m') if mob else URL
        seed(pg, small, url)
        pg.wait_for_timeout(1500)
        bad = {}
        for tab in ['Spots', 'Sessions', 'Gear', 'How it works']:
            sel = ('.mtabs button' if mob else '.tabs button') + f':has-text("{tab}")'
            if pg.locator(sel).count() == 0: continue
            pg.locator(sel).first.click(); pg.wait_for_timeout(400)
            o = overflow(pg); tp = text_problems(pg)
            if o or tp: bad[tab] = o + tp
            pg.screenshot(path=f'{OUT}/vp-{vp[0]}-{tab.replace(" ", "")}.png')
        note(not bad and not errs, f'{vp[0]}x{vp[1]}{" phone" if mob else ""}: tabs fit, no odd text {bad} {errs[:2]}')
        ctx.close()

    # 4. units: every wind unit + ft + °F, on home and spot page
    ctx, pg, errs = page()
    d = big_data(3, 12, 6); 
    for wu in ['kt', 'kmh', 'mph', 'bft']:
        d['settings'].update({'wind': wu, 'height': 'ft', 'temp': 'F'})
        seed(pg, d); pg.wait_for_timeout(1500)
        pg.click('.tile >> nth=0'); pg.wait_for_selector('.reco'); pg.wait_for_timeout(800)
        tp = text_problems(pg)
        note(not tp and not errs, f'units {wu}/ft/°F: spot page reads fine {tp} {errs[:2]}')
    pg.screenshot(path=f'{OUT}/units-bft.png')
    ctx.close()

    # 5. time zones + other locales: a session logged today lands on today
    for tz, loc in [('Pacific/Kiritimati', 'de-DE'), ('America/Los_Angeles', 'en-US'), ('Asia/Kolkata', 'en-IN')]:
        ctx, pg, errs = page(tz=tz, locale=loc)
        seed(pg, big_data(1, 0, 0))
        pg.click('.tile >> nth=0'); pg.wait_for_selector('.reco')
        pg.click('.act:has-text("Log session")')
        pg.wait_for_selector('.felt', timeout=8000)
        today = pg.evaluate("new Date().toLocaleDateString('sv')")
        pg.locator('text=Save session').scroll_into_view_if_needed(); pg.click('text=Save session')
        pg.wait_for_timeout(600)
        se = pg.evaluate(f"JSON.parse(localStorage.getItem('{KEY}')).sessions[0]")
        day = pg.evaluate("d => new Date(d).toLocaleDateString('sv')", se['date'])
        note(day == today and not errs, f'{tz} ({loc}): session logged now is on {day} (today {today}) {errs[:2]}')
        ctx.close()

    # 6. learning per spot and sport: great sessions from N (not in the W window) and poor ones from E
    ctx, pg, errs = page()
    d = big_data(1, 0, 0)
    d['spots'][0].update({'dirs': ['W'], 'min': 6, 'max': 12, 'sports': ['Windsurf', 'Surf']})
    now = int(time.time() * 1000)
    rows = [(9, 0, 5, 'Windsurf'), (10, 10, 5, 'Windsurf'), (8.5, 350, 4, 'Windsurf'), (9, 90, 1, 'Windsurf'), (9.5, 95, 2, 'Windsurf'), (3, 100, 5, 'Surf'), (2, 90, 4, 'Surf')]
    for i, (wv, dv, rt, sport) in enumerate(rows):
        ts = now - (i + 1) * 86400000 * 3
        d['snapshots'].append({'id': f'n{i}', 'spotId': 'sp0', 'lat': d['spots'][0]['lat'], 'lon': d['spots'][0]['lon'], 'ts': ts, 'savedAt': ts, 'primary': 'ecmwf',
            'models': [{'model': 'ecmwf', 'ts': ts, 'wind': wv, 'gust': wv * 1.3, 'dir': dv, 'temp': 20}], 'waves': {'model': 'ecmwfWaves', 'waves': 0.8, 'wavesPeriod': 9, 'wavesDir': 270, 'swell1': 1.2, 'swell1Period': 11, 'swell1Dir': 275, 'wavesPower': None}})
        d['sessions'].append({'id': f's{i}', 'spotId': 'sp0', 'snapshotId': f'n{i}', 'date': ts, 'rating': rt, 'sport': sport, 'start': '', 'end': '', 'gearIds': [], 'gear': '', 'notes': '', 'felt': None, 'gusts': None, 'water': None})
    seed(pg, d)
    pg.click('.tile >> nth=0'); pg.wait_for_selector('.works-head'); pg.click('.works-head'); pg.wait_for_selector('.works .w-row')
    pg.wait_for_timeout(1200)
    txt = pg.locator('.works').inner_text()
    note('Windsurf' in txt and 'Surf' in txt and 'learned from 5 sessions, 3 great' in txt and 'N' in txt, 'what works here, per sport: ' + txt.replace('\n', ' | ')[:300])
    pg.locator('.works').scroll_into_view_if_needed()
    pg.screenshot(path=f'{OUT}/works.png')
    pg.click('.act:has-text("Log session")'); pg.wait_for_selector('.felt')
    chips = pg.locator('[role=radiogroup][aria-label="Sport"] .chip').all_inner_texts()
    pg.get_by_role('radio', name='Surf', exact=True).click()
    pg.locator('text=Save session').scroll_into_view_if_needed(); pg.click('text=Save session')
    pg.wait_for_timeout(600)
    last = pg.evaluate(f"JSON.parse(localStorage.getItem('{KEY}')).sessions.slice(-1)[0]")
    note(chips == ['Windsurf', 'Surf'] and last.get('sport') == 'Surf', f'multi-sport spot: the log asks which sport ({chips}), saved {last.get("sport")}')
    note(not errs, f'no errors {errs[:2]}')
    ctx.close()
    # 7. checked, not worth it; the why line on the map card; linking earlier sessions; start from own ratings; phone layout
    ctx, pg, errs = page()
    d = big_data(2, 8, 4)
    d['sessions'].append({'id': 'loose', 'spotId': None, 'lat': d['spots'][0]['lat'] + 0.03, 'lon': d['spots'][0]['lon'], 'snapshotId': None, 'date': int(time.time() * 1000) - 864e5, 'rating': 4, 'felt': None, 'gusts': None, 'water': None, 'gearIds': [], 'gear': '', 'start': '', 'end': '', 'notes': ''})
    seed(pg, d)
    pg.click('.tile >> nth=0'); pg.wait_for_selector('.reco')
    n0 = pg.locator('.stats .big').first.inner_text()
    pg.click('.act:has-text("Log session")'); pg.wait_for_selector('.chip.notworth', timeout=10000)
    pg.click('.chip.notworth'); pg.wait_for_selector('text=Saved as a poor day')
    pg.wait_for_function("!document.querySelector('.snapless')", timeout=10000)  # the forecast for the session is saved first
    pg.locator('text=Save session').scroll_into_view_if_needed(); pg.click('text=Save session'); pg.wait_for_selector('.reco', timeout=8000)
    st = pg.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")
    chk = [x for x in st['sessions'] if x.get('checked')]
    note(len(chk) == 1 and chk[0]['rating'] == 2 and chk[0]['snapshotId'] and pg.locator('.stats .big').first.inner_text() == n0 and pg.locator('text=Not worth it, didn\'t go').count() >= 1,
         'log session "Not worth it, didn\'t go": a poor day with the forecast, not counted as a session on the water, labelled in the list')
    pg.click('.act:has-text("Show on map")'); pg.wait_for_selector('.sl-pop', timeout=8000); pg.wait_for_timeout(1200)
    why = pg.locator('.sl-pop .sl-why').all_inner_texts()
    note(bool(why) and ('✓' in why[0] or '✕' in why[0] or '~' in why[0]), f'map card shows why: {why[:1]}')
    pg.click('.act:has-text("Show on map")')
    # a new spot next to a session saved without a spot: offer to link it
    pg.goto(URL); pg.wait_for_selector('.spotlog')
    pg.evaluate("([la, lo]) => window.W.singleclick.singleclick.emit('windy-plugin-spotlog', { lat: la, lon: lo, source: 'singleclick' })", [d['spots'][0]['lat'] + 0.03, d['spots'][0]['lon']])
    try:
        pg.wait_for_selector('.act:has-text("Add spot")', timeout=6000)
    except Exception:
        pg.screenshot(path=f'{OUT}/no-place.png')
    if pg.locator('.act:has-text("Add spot")').count():
        pg.click('.act:has-text("Add spot")')
        own = pg.locator('.maptog:has-text("Start from how you usually rate")').count()
        pg.fill('.field input', 'Next door'); pg.click('text=Save spot')
        pg.wait_for_selector('.toast:has-text("earlier session")', timeout=5000)
        pg.click('.toast .undo'); pg.wait_for_timeout(300)
        st = pg.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")
        nd = [x for x in st['spots'] if x['name'] == 'Next door'][0]
        note([x for x in st['sessions'] if x['id'] == 'loose'][0]['spotId'] == nd['id'] and own == 0, 'new spot: offers to link the earlier session nearby (no "start from your own ratings" option for now)')
    else:
        note(False, 'could not open the place card for a new spot')
    note(not errs, f'no errors {errs[:2]}')
    ctx.close()
    ctx, pg, errs = page((390, 844), mobile=True, touch=True)
    seed(pg, big_data(2, 30, 12), URL.replace('index.html', 'index.html?m'))
    pg.wait_for_timeout(1200)
    pg.locator('.mtabs button:has-text("Spots")').first.click(); pg.wait_for_timeout(400)
    pg.locator('.tile').first.click(); pg.wait_for_timeout(600)
    if pg.locator('.sl-acts button:has-text("Details")').count(): pg.locator('.sl-acts button:has-text("Details")').first.click()
    pg.wait_for_selector('.reco', timeout=8000)
    pg.locator('.works-head').click(); pg.wait_for_selector('.works .w-row')
    pg.locator('.works').scroll_into_view_if_needed(); pg.wait_for_timeout(300)
    pg.screenshot(path=f'{OUT}/phone-works.png')
    o = overflow(pg)
    note(not o and not errs, f'phone: spot page with what works open fits {o} {errs[:2]}')
    ctx.close()
    b.close()
print('FINDINGS:', json.dumps(findings, indent=1))
