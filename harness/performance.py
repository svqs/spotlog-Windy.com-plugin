"""Compare one browser/machine using a supplied original dist/plugin.js and the current build.
python3 harness/performance.py <output directory> [<original plugin.js>]
Includes fixed concentrated fixtures, call counts and main-thread long tasks. No network services.
"""
import json, sys, time, platform, re
from pathlib import Path
from playwright.sync_api import sync_playwright
URL = 'http://localhost:8765/harness/index.html'; KEY = 'windy-plugin-spotlog:v1:u12345'
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True)
BASELINE = Path(sys.argv[2]) if len(sys.argv) > 2 else None

def concentrated(count):
    spot = {'id': 's', 'name': 'Concentrated', 'lat': 36.068, 'lon': -5.697, 'sports': ['Windsurf'], 'dirs': ['W'], 'min': 6, 'max': 12, 'created': 1}
    document = {'version': 1, 'spots': [spot], 'snapshots': [], 'sessions': [], 'gear': [], 'settings': {'welcomed': True}}
    for index in range(count):
        ts = 1760000400000 - index * 86400000 # fixed noon UTC, all records distinct days
        wind = 4 + (index * 17 % 130) / 10
        rating = max(1, min(5, round(5 - abs(wind - 10) / 2)))
        models = {model: {'wind': [wind + bias] * 4, 'gust': [wind * 1.3] * 4, 'dir': [270] * 4, 'temp': [20] * 4, 'rain': [0] * 4} for model, bias in [('ecmwf',0), ('gfs',1), ('icon',2)]}
        document['snapshots'].append({'id': f'n{index}', 'spotId': 's', 'lat': spot['lat'], 'lon': spot['lon'], 'ts': ts, 'savedAt': ts - 3600000, 'primary': 'ecmwf',
            'models': [{'model': model, 'ts': ts, 'wind': cols['wind'][0], 'gust': cols['gust'][0], 'dir': 270, 'temp': 20} for model, cols in models.items()],
            'series': {'ts': [ts + offset * 3600000 for offset in [-1,0,1,2]], 'models': models, 'waves': None}})
        document['sessions'].append({'id': f'e{index}', 'spotId': 's', 'snapshotId': f'n{index}', 'date': ts, 'rating': rating, 'sport': 'Windsurf', 'start': '09:00', 'end': '10:00', 'tz': 'UTC', 'gearIds': [], 'gear': '', 'notes': ''})
    return document

def instrument(source):
    source, matches = re.subn(r'function modelSkill\(([^)]+)\) \{', lambda m: m.group(0)+' window.perfCounts.skill++;', source)
    assert matches == 1, 'Could not instrument compiled modelSkill'
    pattern = r'const examplesFor = \(spot, sessions, snapshots, model\)=>([^;]+);'
    source, count = re.subn(pattern, lambda match: 'const examplesFor = (spot, sessions, snapshots, model)=>{window.perfCounts.examples++; return ' + match.group(1) + ';};', source)
    assert count == 1, 'Could not instrument compiled examplesFor'
    return source

report = {'machine': platform.platform(), 'browser': None, 'fixture': 'fixed distinct-day qualified outings; 3 models at one spot', 'runs': []}
with sync_playwright() as p:
    browser = p.chromium.launch(); report['browser'] = browser.version
    sources = [('after', Path('dist/plugin.js'))]
    if BASELINE: sources.insert(0, ('before', BASELINE))
    for label, source_path in sources:
        source = instrument(source_path.read_text())
        for count in [100,300,600]:
            for repeat in range(3):
                context = browser.new_context(viewport={'width':1440,'height':900}, timezone_id='America/Los_Angeles', locale='en-GB')
                pg = context.new_page(); errors = []; pg.on('pageerror',lambda error:errors.append(str(error)))
                pg.route('**/dist/plugin.js', lambda route:route.fulfill(body=source,content_type='text/javascript'))
                mock = Path('harness/mock-windy.js').read_text() + '\nwindow.__spotlogCloudMock = null;'
                pg.route('**/harness/mock-windy.js',lambda route:route.fulfill(body=mock,content_type='text/javascript'))
                fixture = concentrated(count)
                pg.add_init_script('localStorage.setItem('+json.dumps(KEY)+', '+json.dumps(json.dumps(fixture))+'); window.perfCounts={skill:0, examples:0};window.longTasks=[];new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:"longtask",buffered:true});')
                started = time.perf_counter(); pg.goto(URL); pg.wait_for_selector('.tile .now .sw'); startup=(time.perf_counter()-started)*1000
                pg.click('.tile'); pg.wait_for_selector('.snap .cells'); pg.wait_for_selector('.models-pick'); pg.wait_for_timeout(800)
                # Let background models settle before measuring preference work.
                start = time.perf_counter(); pg.locator('.topbar .units').first.click(); pg.wait_for_selector('.set')
                before=pg.evaluate('({...perfCounts})'); pg.evaluate('longTasks=[]')
                pg.get_by_role('button', name='kt', exact=True).click()
                pg.wait_for_function("JSON.parse(localStorage.getItem('"+KEY+"')).settings.wind==='kt'")
                units=(time.perf_counter()-start)*1000; pg.wait_for_timeout(100)
                after=pg.evaluate('({...perfCounts})'); tasks=pg.evaluate('longTasks')
                result={'version':label,'outings':count,'repeat':repeat,'startupMs':round(startup,1),'unitsMs':round(units,1),'preferenceSkillCalls':after['skill']-before['skill'],'preferenceExampleCalls':after['examples']-before['examples'],'unitsLongTaskMaxMs':round(max(tasks,default=0),1)}
                assert not errors,errors
                if label=='after':assert result['preferenceSkillCalls']==0 and result['preferenceExampleCalls']==0,result
                report['runs'].append(result);print(json.dumps(result),flush=True);context.close()
    browser.close()
(OUT/'performance.json').write_text(json.dumps(report,indent=2)+'\n')
