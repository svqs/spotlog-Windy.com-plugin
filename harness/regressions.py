"""Focused browser checks for the optimization: identity races, metadata and malformed imports.
Needs the rebuilt plugin and a server on :8765. No external services are contacted.
"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
URL = 'http://localhost:8765/harness/index.html'
KEY = 'windy-plugin-spotlog:v1:u12345'
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/spotlog-regressions'); OUT.mkdir(parents=True, exist_ok=True)
BASE = {'version': 1, 'spots': [], 'sessions': [], 'snapshots': [], 'gear': [], 'settings': {'welcomed': True}}
SPOT = {'id': 's', 'name': 'Keep metadata', 'lat': 36.068, 'lon': -5.697, 'sports': ['Windsurf'], 'dirs': ['W'], 'min': 6, 'max': 12, 'created': 1, 'recommendationModel': 'gfs', 'ranges': {'Windsurf': {'wind': {'lo': 7, 'hi': 13}}}}

def read(pg, key=KEY): return pg.evaluate('(key) => JSON.parse(localStorage.getItem(key))', key)
def seed(pg, document):
    pg.goto(URL); pg.evaluate('localStorage.clear()'); pg.evaluate('([key, data]) => localStorage.setItem(key, JSON.stringify(data))', [KEY, document]); pg.reload(); pg.wait_for_selector('.spotlog')

with sync_playwright() as p:
    browser = p.chromium.launch()
    def fresh():
        context = browser.new_context(viewport={'width': 1440, 'height': 900}, timezone_id='Europe/Prague', locale='en-GB')
        pg = context.new_page(); errors = []; pg.on('pageerror', lambda error: errors.append(str(error)))
        return context, pg, errors

    context, pg, errors = fresh()
    seed(pg, {**BASE, 'spots': [SPOT]})
    pg.locator('.tile').click(); pg.wait_for_selector('.snap .cells'); pg.get_by_text('Edit', exact=True).first.click()
    pg.locator('.field input').first.fill('Renamed')
    pg.evaluate("W.__mock.singleclick.emit('windy-plugin-spotlog', {lat: 36.068, lon: -5.4})")
    pg.wait_for_timeout(150); pg.get_by_text('Save changes', exact=True).click(); pg.wait_for_timeout(200)
    edited = read(pg)['spots'][0]
    assert edited['recommendationModel'] == 'gfs' and edited['ranges'] == SPOT['ranges'] and edited['created'] == 1 and edited['id'] == 's'
    assert edited['lon'] == -5.4 and edited['name'] == 'Renamed'
    pg.screenshot(path=str(OUT/'edited-spot.png')); assert not errors, errors; context.close()
    print('✓ moved/renamed spot preserves fallback model, ranges, id and creation time', flush=True)

    context, pg, errors = fresh(); seed(pg, BASE)
    # Same latitude, different longitude, reverse completion order. Inject before either request.
    pg.evaluate("""() => {
      const original = W.fetch.getPointForecastData;
      W.fetch.getPointForecastData = async (model, coords, options) => {
        await new Promise(resolve => setTimeout(resolve, coords.lon === -5.5 ? 350 : 20));
        const answer = await original(model, coords, options);
        if (answer.data.data.wind) answer.data.data.wind.fill(coords.lon === -5.5 ? 3 : 11);
        return answer;
      };
      W.reverseName.get = async coords => {await new Promise(resolve => setTimeout(resolve, coords.lon === -5.5 ? 300 : 10)); return {name: coords.lon === -5.5 ? 'Old place' : 'Latest place'};};
      W.__mock.singleclick.emit('windy-plugin-spotlog', {lat: 35.9, lon: -5.5});
      W.__mock.singleclick.emit('windy-plugin-spotlog', {lat: 35.9, lon: -5.2});
    }""")
    pg.wait_for_selector('.title:has-text("Latest place")'); pg.wait_for_timeout(700)
    assert pg.locator('.title').inner_text() == 'Latest place'
    assert pg.locator('.snap .cells').inner_text().splitlines()[1] == '11', pg.locator('.snap .cells').inner_text()
    assert not errors, errors; context.close(); print('✓ reversed same-latitude forecast/place responses keep latest longitude', flush=True)

    context, pg, errors = fresh()
    mock = Path('harness/mock-windy.js').read_text() + '''
      let release; window.delayedA = new Promise(resolve => release = resolve); window.releaseA = release;
      __spotlogCloudMock.pull = auth => auth.id === 12345 ? delayedA : Promise.resolve(null);
      window.writes = []; __spotlogCloudMock.push = async (auth, data) => {writes.push({id: auth.id, data}); return 1;};
    '''
    pg.route('**/harness/mock-windy.js', lambda route: route.fulfill(body=mock, content_type='text/javascript'))
    seed(pg, {**BASE, 'gear': [{'id': 'a', 'name': 'Account A', 'kind': 'Board'}]})
    pg.evaluate("""() => {
      localStorage.setItem('windy-plugin-spotlog:v1:u23456', JSON.stringify({version:1,spots:[],sessions:[],snapshots:[],gear:[{id:'b',name:'Account B',kind:'Board'}],settings:{welcomed:true}}));
      W.__mock.store.set('userToken', 'mock-token-23456'); W.__mock.store.set('user', {id: 23456, username: 'B'});
    }""")
    pg.wait_for_timeout(100)
    pg.evaluate("releaseA({data: {version:1,spots:[],sessions:[],snapshots:[],gear:[{id:'late',name:'Late A',kind:'Board'}],settings:{welcomed:true}},revision:1,updatedAt:1})")
    pg.wait_for_timeout(500)
    assert pg.evaluate("writes.every(write => write.id !== 12345 || !write.data.gear.some(item => item.name === 'Late A'))")
    assert read(pg, 'windy-plugin-spotlog:v1:u23456')['gear'][0]['name'] == 'Account B'
    assert pg.evaluate('writes.every(write => write.id !== 12345)')
    assert not errors, errors; context.close(); print('✓ delayed account A result cannot populate account B or trigger an A write', flush=True)


    context, pg, errors = fresh(); seed(pg, {**BASE, 'spots': [SPOT]})
    pg.locator('.tile').click(); pg.get_by_text('Log session', exact=True).first.click(); pg.wait_for_selector('.ratings')
    pg.evaluate("""() => {
      const text = File.prototype.text;
      File.prototype.text = function() {
        if (this.name === 'old.gpx') return new Promise(resolve => window.releaseTrack = () => text.call(this).then(resolve));
        return text.call(this);
      };
    }""")
    gpx = b'<gpx><trk><trkseg><trkpt lat="36.068" lon="-5.697"><time>2026-10-04T12:00:00Z</time></trkpt><trkpt lat="36.069" lon="-5.698"><time>2026-10-04T12:01:00Z</time></trkpt></trkseg></trk></gpx>'
    field = pg.locator('input[accept*=".gpx"]')
    field.set_input_files({'name': 'old.gpx', 'mimeType': 'application/gpx+xml', 'buffer': gpx})
    field.set_input_files({'name': 'new.gpx', 'mimeType': 'application/gpx+xml', 'buffer': gpx})
    pg.wait_for_selector('text=new.gpx'); pg.evaluate('releaseTrack()'); pg.wait_for_timeout(100)
    pg.get_by_text('Save session', exact=True).click(); pg.wait_for_timeout(300)
    assert read(pg)['sessions'][0]['track']['source'] == 'new.gpx'; assert not errors, errors; context.close()
    print('✓ reverse-order track imports attach only the latest operation', flush=True)

    context, pg, errors = fresh()
    broken = {**BASE, 'spots': [SPOT], 'snapshots': [{'id': 'bad', 'spotId': 's', 'lat': 36.068, 'lon': -5.697, 'ts': 1, 'savedAt': 1, 'models': [], 'series': {'ts': []}, 'note': 'preserve note'}],
              'sessions': [{'id': 'same', 'spotId': 's', 'snapshotId': 'bad', 'date': 1, 'start': '99:99', 'rating': 4, 'notes': 'preserve linked outing'}, {'id': 'same', 'date': 1}]}
    seed(pg, broken); pg.click('.tabs button:has-text("Sessions")'); pg.wait_for_selector('.sw'); assert pg.locator('.sw').count() == 2
    pg.locator('.sw .front').first.click(); pg.wait_for_selector('.ratings'); pg.get_by_text('Save changes', exact=True).click(); pg.wait_for_timeout(300)
    data = read(pg); assert len(data['sessions']) == 2 and len({item['id'] for item in data['sessions']}) == 2
    assert data['snapshots'][0]['forecastInvalid'] and data['snapshots'][0]['note'] == 'preserve note'
    assert any(item.get('notes') == 'preserve linked outing' for item in data['sessions'])
    pg.reload(); pg.wait_for_selector('.spotlog'); assert not errors, errors; context.close()
    print('✓ malformed saved series and duplicate ids preserve notes, links and all outings through reload', flush=True)
    context, pg, errors = fresh()
    pg.goto('http://localhost:8765/harness/stylelab/preview.html')
    pg.wait_for_function('!!window.__spotlogDesign')
    pg.evaluate("__spotlogDesign.apply({words:{gearAddTitle:'Preview gear',formSaveEdit:'Preview save'}})")
    pg.evaluate("__spotlogDesign.goto('gear')")
    pg.wait_for_selector('text=Preview gear')
    pg.evaluate("__spotlogDesign.goto('about')")
    pg.wait_for_selector('.about')
    pg.evaluate("__spotlogDesign.goto('spotForm')")
    pg.wait_for_selector('button:has-text("Preview save")')
    pg.screenshot(path=str(OUT/'stylelab-spot-form.png'))
    assert not errors, errors; context.close()
    print('✓ extracted screens and live copy overrides work in Style Lab', flush=True)
    browser.close()
