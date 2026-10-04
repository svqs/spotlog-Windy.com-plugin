/** Quick checks of the learning (src/lib/predict.ts) in Node:  npm run test:predict */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'node_modules/.cache/spotlog-predict');
mkdirSync(out, { recursive: true });
try {
    execFileSync(path.join(root, 'node_modules/.bin/tsc'), ['--outDir', out, '--module', 'commonjs', '--target', 'es2020', '--skipLibCheck', '--noEmitOnError', 'false',
        path.join(root, 'src/lib/predict.ts')], { stdio: 'pipe' });
} catch { /* type noise from Windy's types: the JS is still written */ }
writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
const require = createRequire(path.join(out, 'x.js'));
const P = require('./predict.js');
const F = require('./learn/features.js');
const S = require('./learn/similar.js');
const T = require('./learn/trees.js');


/* ---------- builders: a spot, a saved day of forecast, a session (all in UTC so clocks are plain) ---------- */
const H = 3600e3;
const DAY0 = Date.UTC(2026, 6, 1);
const spot = (o = {}) => ({ id: 's', name: 'Spot', lat: 0, lon: 0, sports: ['Windsurf'], dirs: ['W', 'SW'], min: 6, max: 12, created: 0, ...o });
let ids = 0;
/** a saved day: 25 hourly points from `from`, values from f(hourIndex) */
function day(from, f, o = {}) {
    const ts = Array.from({ length: 25 }, (_, i) => from + i * H);
    const v = ts.map((_, i) => ({ wind: 8, gust: 11, dir: 260, temp: 20, rain: 0, waves: 0.8, period: 6, swell: null, ...f(i) }));
    const col = k => v.map(x => x[k]);
    return {
        id: 'sn' + ++ids, spotId: o.spotId ?? 's', lat: 0, lon: 0, ts: from, savedAt: o.savedAt ?? from - H, primary: 'ecmwf', models: [],
        waves: null,
        series: { ts, models: { ecmwf: { wind: col('wind'), gust: col('gust'), dir: col('dir'), temp: col('temp'), rain: col('rain') } },
            waves: { model: 'ecmwfWaves', waves: col('waves'), wavesPeriod: col('period'), wavesPower: col('waves').map(() => null), wavesDir: col('dir'), swell1: col('swell'), swell1Period: col('swell').map(x => (x ? 11 : null)), swell1Dir: col('swell').map(x => (x ? 280 : null)) } },
    };
}
const clock = ts => new Date(ts).toISOString().slice(11, 16);
/** a session from `start` for `hours`, rated `rating`, on a saved day */
const session = (sn, start, hours, rating, o = {}) => ({
    id: 'se' + ++ids, spotId: 's', snapshotId: sn.id, date: start, rating, felt: null, gusts: null, water: null, gear: '', gearIds: [], notes: '',
    start: clock(start), end: hours ? clock(start + hours * H) : '', tz: 'UTC', ...o,
});
/** n outings on n different days at wind w (± a little), direction d, rated r */
function outings(n, w, d, r, o = {}) {
    const snaps = [];
    const sessions = [];
    for (let k = 0; k < n; k++) {
        const t0 = DAY0 + (o.day0 ?? 0) * 864e5 + k * 864e5;
        const sn = day(t0, () => ({ wind: w + (k % 3) * 0.3, dir: d, ...(o.values || {}) }), { spotId: o.spotId });
        snaps.push(sn);
        sessions.push(session(sn, t0 + 12 * H, 2, typeof r === 'function' ? r(k) : r, { spotId: o.spotId ?? 's', sport: o.sport }));
    }
    return { snaps, sessions };
}
const learn = (sp, data, spots = [sp]) => P.learnSpot(sp, spots, data.sessions, data.snaps);
const x = (wind, dir, more = {}) => ({ wind, dir, gust: wind * 1.3, waves: 0.8, temp: 20, rain: 0, ...more });
const rateOf = (models, f) => P.rate(models[0], f);
let n = 0;
const ok = m => { n++; console.log('✓', m); };

/* ---------- 1. examples: only a forecast saved before the outing teaches ---------- */
{
    const sp = spot();
    const sn = day(DAY0, i => ({ wind: 5 + i }));
    const before = P.exampleOf(sp, session(sn, DAY0 + 12 * H, 2, 4), [sn], 'ecmwf');
    const late = { ...sn, id: 'late', savedAt: DAY0 + 13 * H };
    assert.equal(P.exampleOf(sp, session(late, DAY0 + 12 * H, 2, 4), [late], 'ecmwf'), 'saved after start');
    // the outing 12:00–14:00: hours 12, 13, 14 → median wind 18, strongest gust
    assert.equal(before.x.wind, 18);
    assert.equal(before.from.hours, 3);
    // two sessions on one saved day each read their own hours
    const other = P.exampleOf(sp, session(sn, DAY0 + 6 * H, 1, 3), [sn], 'ecmwf');
    assert.equal(other.x.wind, 11.5);
    ok('examples: a forecast saved after the start doesn\'t teach; a shared saved day gives each outing its own hours');
}
{
    const sp = spot();
    const sn = day(DAY0, () => ({}));
    // overnight in UTC: 22:00 → 01:00 is 3 hours
    const t = P.outingTimes(session(sn, DAY0 + 22 * H, 3, 4));
    assert.equal((t.end - t.start) / H, 3);
    // daylight saving: Prague, night of 25 Oct 2026 (clocks go back at 03:00): 01:00 → 04:00 local is 4 real hours
    const start = Date.UTC(2026, 9, 24, 23); // 01:00 CEST
    const dst = P.outingTimes({ ...session(sn, start, 0, 4), start: '01:00', end: '04:00', tz: 'Europe/Prague' });
    assert.equal((dst.end - dst.start) / H, 4);
    // start only: the nearest hour, marked limited
    const one = P.exampleOf(sp, { ...session(sn, DAY0 + 12 * H, 0, 4), end: '' }, [sn], 'ecmwf');
    assert.equal(one.from.limited, true);
    ok('outing times: overnight, a daylight-saving night, start-only sessions marked limited');
}
{
    const sp = spot();
    const sn = day(DAY0, () => ({}));
    const gappy = { ...sn, id: 'gappy', series: { ...sn.series, ts: sn.series.ts.map((t, i) => (i >= 13 ? t + 2 * H : t)) } };
    assert.equal(P.exampleOf(sp, session(gappy, DAY0 + 12 * H, 3, 4), [gappy], 'ecmwf'), 'gap');
    const surf = spot({ sports: ['Surf'] });
    const noSwell = day(DAY0, () => ({ waves: null, period: null }));
    assert.equal(P.exampleOf(surf, session(noSwell, DAY0 + 12 * H, 2, 4), [noSwell], 'ecmwf'), 'missing core');
    // an old single-hour save (no saved day) still teaches when saved for the start, marked limited
    const old = { id: 'old', spotId: 's', lat: 0, lon: 0, ts: DAY0 + 12 * H, savedAt: DAY0 + 10 * H, primary: 'ecmwf', models: [{ model: 'ecmwf', ts: DAY0 + 12 * H, wind: 9, gust: 12, dir: 250, temp: 20 }], waves: null };
    const e = P.exampleOf(sp, session(old, DAY0 + 12 * H, 2, 4), [old], 'ecmwf');
    assert.equal(e.x.wind, 9); assert.equal(e.from.limited, true);
    assert.equal(P.exampleOf(sp, session(sn, DAY0 + 12 * H, 2, 4), [sn], 'gfs'), 'model missing');
    ok('examples: a forecast gap or missing surf data excludes; an old single-hour save counts as limited');
}

/* ---------- 2. similar sessions: no evidence, your window, poor and mixed outcomes ---------- */
{
    const none = { snaps: [], sessions: [] };
    assert.equal(rateOf(learn(spot({ windUnknown: true, dirs: [] }), none), x(9, 260)).level, 0);
    // a preset window you never confirmed isn't knowledge
    const preset = rateOf(learn(spot(), none), x(9, 260));
    assert.equal(preset.level, 0); assert.deepEqual(preset.reasons, ['few sessions']);
    // a window you confirmed: Good inside it (from your range), not outside
    const mine = learn(spot({ windowConfirmed: true }), none);
    const inside = rateOf(mine, x(9, 260));
    assert.equal(inside.level, 3); assert.equal(inside.source, 'user range');
    assert.equal(rateOf(mine, x(9, 90)).level, 0);
    ok('no outings: nothing without a window; a preset window stays "not sure"; a confirmed one gives Good from your range');
}
{
    const sp = spot({ windowConfirmed: true });
    const poor = outings(4, 9, 260, 2);
    const r = rateOf(learn(sp, poor), x(9, 260));
    assert.equal(r.level, 0); assert.deepEqual(r.reasons, ['only poor sessions']);
    ok('poor outings in these conditions overrule your confirmed window (never Good from poor-only)');
}
{
    const sp = spot();
    const good = outings(6, 9, 260, k => (k % 2 ? 5 : 4));
    const bad = outings(6, 15, 260, 1, { day0: 10 });
    const data = { snaps: [...good.snaps, ...bad.snaps], sessions: [...good.sessions, ...bad.sessions] };
    const m = learn(sp, data);
    const there = rateOf(m, x(9.3, 260));
    const windy = rateOf(m, x(15.3, 260));
    assert.ok(there.level >= 3 && there.score > windy.score + 1, JSON.stringify([there, windy])); assert.equal(there.source, 'similar sessions');
    assert.equal(windy.level, 0);
    // and the descriptive range shows where the great ones were
    assert.deepEqual(m[0].rows.find(r => r.key === 'wind').spans.map(s => [s.lo, s.hi]), [[9, 9.6]]);
    ok(`mixed outcomes: rated from similar outings (${there.score.toFixed(2)} near 9 m/s, ${windy.score.toFixed(2)} near 15); "What works" shows 9–9.6`);
}
{
    const sp = spot({ windowConfirmed: true });
    const ok3 = outings(3, 9, 260, 4);
    assert.equal(rateOf(learn(sp, ok3), x(9, 260)).level, 3, 'great needs 3 outings rated 4+');
    const five = outings(6, 9, 260, k => (k < 2 ? 5 : 4));
    assert.equal(rateOf(learn(spot(), five), x(9, 260)).level, 5);
    assert.ok(rateOf(learn(spot(), outings(6, 9, 260, k => (k ? 4 : 5))), x(9, 260)).level <= 4, 'epic needs two 5s');
    ok('evidence for the tags: great from 3 great outings, epic from 6 with two 5s');
}
{
    // outings at a spot next door (2 km) never make a learned tag on their own
    const sp = spot();
    const next = spot({ id: 'n', lat: 0.018 });
    const there = outings(8, 9, 260, 5, { spotId: 'n' });
    const r = rateOf(learn(sp, there, [sp, next]), x(9, 260));
    assert.equal(r.level, 0);
    assert.ok(r.score > 3.4, 'they still move the score');
    ok('spots next door count a little, but never as evidence for a tag here');
}
{
    // one day logged five times counts like one outing
    const sp = spot();
    const sn = day(DAY0, () => ({}));
    const same = { snaps: [sn], sessions: [1, 2, 3, 4, 5].map(k => session(sn, DAY0 + (7 + k * 2) * H, 1, 5)) };
    const r = rateOf(learn(sp, same), x(8, 260));
    assert.ok(r.nEff < 3 && r.level === 0, JSON.stringify(r));
    ok('the same day logged many times counts as one day');
}
{
    assert.ok(F.distance2('Windsurf', x(9, 350), x(9, 10)) < F.distance2('Windsurf', x(9, 260), x(9, 300)), 'wraparound');
    const full = F.distance2('Windsurf', x(9, 260), x(9, 260));
    const noTemp = F.distance2('Windsurf', x(9, 260, { temp: null }), x(9, 260));
    assert.ok(noTemp > full, 'a missing extra never looks closer');
    assert.equal(F.distance2('Windsurf', x(null, 260), x(9, 260)), null);
    ok('distance: directions wrap round north; missing extras count as different; a missing core can\'t be compared');
}

/* ---------- 3. when to go: two-hour windows, no gaps, per sport ---------- */
{
    const sp = spot({ windowConfirmed: true, sports: ['Windsurf', 'Surf'] });
    const m = learn(sp, { snaps: [], sessions: [] });
    const h = (i, wind, dir = 260, more = {}) => ({ ts: DAY0 + i * H, day: true, wind, gust: wind, dir, waves: 0.8, period: 6, ...more });
    // one good hour alone is no window
    assert.equal(P.bestIn(m, [h(10, 3), h(11, 9), h(12, 3)], DAY0, DAY0 + 864e5, DAY0), null);
    // 10–12 and 13–15, the hour between missing: two stretches, never 10–15
    const gap = P.bestIn(m, [h(10, 9), h(11, 9), h(13, 9), h(14, 9)], DAY0, DAY0 + 864e5, DAY0);
    assert.deepEqual([(gap.start - DAY0) / H, (gap.end - DAY0) / H], [10, 12]);
    // a longer near-equal stretch wins over a short one
    const long = P.bestIn(m, [h(8, 9), h(9, 9), h(11, 9), h(12, 9), h(13, 9), h(14, 9)], DAY0, DAY0 + 864e5, DAY0);
    assert.deepEqual([(long.start - DAY0) / H, (long.end - DAY0) / H], [11, 15]);
    // the tag names the sport that matched; surf without swell data stays out
    assert.equal(long.sport, 'Windsurf');
    assert.equal(P.rate(m[1], F.toFeatures(h(11, 9, 260, { waves: null, period: null }))).level, 0);
    assert.equal(P.rate(m[0], F.toFeatures(h(11, 9, 260, { waves: null, period: null }))).level, 3);
    ok('windows: no one-hour stretches, no bridged gaps, a longer near-equal stretch wins, the matching sport is named');
}
{
    const sp = spot({ windowConfirmed: true });
    const m = learn(sp, { snaps: [], sessions: [] });
    const hours = [];
    for (let d = 0; d < 3; d++) {for (let i = 8; i < 20; i++) {hours.push({ ts: DAY0 + d * 864e5 + i * H, day: true, wind: d === 1 ? 3 : 9, gust: 9, dir: 260, waves: 0.8 });}}
    const days = P.nextDays(m, hours, 2, DAY0);
    assert.ok(days[0].best === null && days[1].best !== null);
    ok('next days: each day on its own (a calm day stays empty)');
}

/* ---------- 4. boosted trees: only with lots of varied data, deterministic ---------- */
{
    const sp = spot();
    const small = outings(20, 9, 260, 4);
    assert.equal(T.treesEligible(learn(sp, small)[0].local), false);
    // 120 outings on 120 days: great between 9 and 12 m/s from the west, poor otherwise
    const big = { snaps: [], sessions: [] };
    for (let k = 0; k < 120; k++) {
        const w = 4 + (k * 7) % 14;
        const d = k % 4 ? 260 : 90;
        const sn = day(DAY0 + k * 864e5, () => ({ wind: w, dir: d }));
        big.snaps.push(sn);
        big.sessions.push(session(sn, DAY0 + k * 864e5 + 12 * H, 2, w >= 9 && w <= 12 && d === 260 ? 5 : w >= 7 && d === 260 ? 3 : 1));
    }
    const m = learn(sp, big)[0];
    assert.equal(T.treesEligible(m.local), true);
    const a = T.trainTrees(m.sport, m.local, m.nearby, m.prior);
    const b = T.trainTrees(m.sport, m.local, m.nearby, m.prior);
    assert.deepEqual(a, b, 'deterministic');
    if (a) {assert.ok(T.treeScore(a, x(10, 260)) > T.treeScore(a, x(16, 260)));}
    assert.equal(a && T.treeScore(a, x(40, 260)), a ? null : null, 'no guess outside what it saw');
    // in the app: trained in the background, picked up when the spot is learned again, dropped after a diary change
    if (a) {
        assert.equal(await P.trainTreesInBackground(learn(sp, big)), true);
        assert.ok(learn(sp, big)[0].trees, 'picked up');
        assert.equal(P.rate(learn(sp, big)[0], x(10, 260)).source, 'boosted trees');
        const more = { snaps: big.snaps, sessions: [...big.sessions, session(big.snaps[0], DAY0 + 15 * H, 1, 2)] };
        assert.equal(learn(sp, more)[0].trees, null, 'a changed diary needs new trees');
    }
    ok(`boosted trees: not with 20 outings; with 120 deterministic (${a ? `on, error ${a.check.maeTrees.toFixed(2)} vs ${a.check.maeSimilar.toFixed(2)}` : 'stayed off: similar sessions were as good'})`);
}

/* ---------- 5. tide ---------- */
{
    const th = P.bestTide([{ rating: 5, tide: 'High', tideMove: 'Rising' }, { rating: 4, tide: 'High', tideMove: 'Falling' }, { rating: 2, tide: 'Low' }]);
    assert.equal(th.tide, 'High'); assert.equal(th.move, null);
    const tz = { highs: [0, 12.4 * H], lows: [6.2 * H] };
    assert.deepEqual(P.tideAt(tz, 1 * H), { tide: 'High', move: 'Falling' });
    assert.deepEqual(P.tideAt(tz, 3 * H), { tide: 'Mid', move: 'Falling' });
    assert.deepEqual(P.tideAt(tz, 7 * H), { tide: 'Low', move: 'Rising' });
    assert.equal(P.tideAt(tz, 20 * H), null);
    ok('tide: the tide most great outings had; the tide at a time from saved highs and lows');
}
console.log(`${n} learning checks passed`);
