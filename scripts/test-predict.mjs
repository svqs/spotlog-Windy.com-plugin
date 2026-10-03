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

const spot = { id: 's', name: 'Spot', lat: 0, lon: 0, sports: ['Windsurf'], dirs: ['W', 'SW'], min: 6, max: 12, created: 0 };
const c = (wind, dir, gust = null, waves = null, extra = {}) => ({ wind, dir, gust, waves, ...extra });
const smp = (wind, dir, rating, gust = null, waves = null, sport = 'Windsurf', extra = {}) => ({ ...c(wind, dir, gust, waves, extra), rating, sport, tide: null, tideMove: null });
const learn = (samples, s = spot) => P.learnSpot(s, samples);
const lvl = g => P.shownLevel(g?.rating ?? null);
let n = 0;
const ok = (m) => { n++; console.log('✓', m); };

// 1. no sessions: the wind window is the starting guess; outside it: not sure yet
let m = learn([]);
assert.equal(lvl(P.guess(m, c(9, 260))), 3);
assert.equal(lvl(P.guess(m, c(9, 90))), 0);
assert.equal(lvl(P.guess(m, c(25, 260))), 0);
ok('no sessions: inside the wind window "Likely good", outside "Not sure yet"');

// 2. ranges are learned from great sessions
const hist = [smp(9, 265, 5, 11, 0.6), smp(11, 250, 5, 14, 0.8), smp(10, 275, 4, 13, 0.7), smp(13, 270, 2, 20, 1.8), smp(10, 90, 1, 13, 0.5), smp(5, 260, 2, 7, 0.3)];
m = learn(hist);
const wind = m[0].params.find(p => p.key === 'wind');
assert.equal(wind.from, 'sessions'); assert.ok(wind.lo > 7.5 && wind.hi < 13, wind);
ok(`wind range learned from the great sessions: ${wind.lo.toFixed(1)}–${wind.hi.toFixed(1)} m/s`);

// 3. which conditions matter: all 3 poor days had waves outside the range, 2 the wind, 1 the direction
const imp = Object.fromEntries(m[0].params.map(p => [p.key, +p.importance.toFixed(2)]));
assert.ok(imp.waves > 0.7 && imp.wind > 0.5 && imp.dir < imp.waves, imp);
ok('importance learned from poor vs great sessions: ' + JSON.stringify(imp));

// 4. a day like the great ones is great or epic; a day like the poor ones is not shown
assert.ok(lvl(P.guess(m, c(10, 262, 13, 0.7))) >= 4, P.guess(m, c(10, 262, 13, 0.7)));
assert.equal(lvl(P.guess(m, c(10, 90, 13, 0.7))), 0);
assert.equal(lvl(P.guess(m, c(14, 265, 21, 1.9))), 0);
ok('fitting days are Likely great/epic; east wind or too strong and wavy: "Not sure yet" (never negative)');

// 5. a condition that never decides the day matters little
const any = [smp(9, 260, 5, 11, 0.4), smp(9, 262, 2, 11, 1.6), smp(9, 258, 5, 11, 1.5), smp(9, 265, 1, 11, 0.5), smp(9, 268, 2, 11, 1.0)];
const m2 = learn(any);
const wImp = m2[0].params.find(p => p.key === 'wind').importance;
assert.ok(wImp < 0.4, wImp);
ok(`wind that was the same on great and poor days matters little (${wImp.toFixed(2)})`);

// 6. each sport learns separately at a multi-sport spot
const both = { ...spot, sports: ['Windsurf', 'Surf'] };
const mix = [smp(11, 270, 5, 14, 1, 'Windsurf'), smp(12, 265, 4, 15, 1.1, 'Windsurf'),
    smp(3, 90, 5, 4, 1.5, 'Surf', { swell: 1.4, swellPeriod: 12, swellDir: 280 }), smp(2, 100, 5, 3, 1.6, 'Surf', { swell: 1.5, swellPeriod: 13, swellDir: 275 })];
const m3 = learn(mix, both);
assert.deepEqual(m3.map(x => x.sport), ['Windsurf', 'Surf']);
const g = P.guess(m3, c(2.5, 95, 3.5, 1.5, { swell: 1.45, swellPeriod: 12, swellDir: 278 }));
assert.equal(g.sport, 'Surf'); assert.ok(lvl(g) >= 4, g);
ok('per sport: light offshore wind with a 12 s swell is a great surf day (not a windsurf day)');

// 7. best window of the day
const now = new Date(); now.setHours(12, 0, 0, 0);
const hours = Array.from({ length: 12 }, (_, i) => ({ ts: now.getTime() + i * 3600e3, ...c(i >= 6 && i <= 8 ? 9 : 3, 260), day: i < 9 }));
const best = P.bestToday(learn([]), hours, now.getTime());
assert.ok(best && new Date(best.start).getHours() === 18 && !best.now, best);
ok('best window today: found at 18:00 when now is too light');

// 8. tide hint
const th = P.bestTide([{ rating: 5, tide: 'High', tideMove: 'Rising' }, { rating: 4, tide: 'High', tideMove: 'Falling' }, { rating: 2, tide: 'Low' }]);
assert.equal(th.tide, 'High'); assert.equal(th.move, null);
ok('tide: the tide most great sessions had');
console.log(`${n} learning checks passed`);
