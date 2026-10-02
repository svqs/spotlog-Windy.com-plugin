/** Quick checks of the rating guess (src/lib/predict.ts) in Node:  npm run test:predict */
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

const spot = { id: 's', name: 'Spot', lat: 0, lon: 0, sports: [], dirs: ['W', 'SW'], min: 6, max: 12, created: 0 };
const c = (wind, dir, gust = null, waves = null) => ({ wind, dir, gust, waves });
const smp = (wind, dir, rating, gust = null, waves = null) => ({ wind, dir, gust, waves, rating, tide: null, tideMove: null });
let n = 0;
const ok = (m) => { n++; console.log('✓', m); };

// 1. no sessions: inside the window it's a good guess, outside "not sure yet"
let g = P.guess(spot, c(9, 260), []);
assert.equal(P.shownLevel(g.rating), 3); assert.equal(g.fromWindow, true); assert.equal(g.similar, 0);
assert.equal(P.guess(spot, c(9, 90), []).rating, null);
ok('the wind window is the starting guess; outside it: not sure yet');

// 2. bad sessions never show as a negative word
const bad = [smp(9, 260, 1), smp(9.5, 255, 2), smp(8.5, 265, 1)];
g = P.guess(spot, c(9, 260), bad);
assert.equal(P.shownLevel(g.rating), 0); assert.equal(g.similar, 3);
ok('poor history: "not sure yet", never "probably flat"');

// 3. great sessions take over
g = P.guess(spot, c(9, 260), [smp(9, 260, 5), smp(10, 250, 5), smp(8, 270, 4)]);
assert.ok(P.shownLevel(g.rating) >= 4 && g.rating > 4, g.rating); assert.equal(g.similar, 3);
ok('great sessions in similar conditions: likely great/epic, "from 3 similar sessions"');

// 4. relative wind: 2 m/s apart is far at 4 m/s, close at 20 m/s
assert.ok(P.distance(c(4, 0), c(6, 0)) > P.distance(c(20, 0), c(22, 0)) * 2);
ok('wind differences are relative to the strength');

// 5. gusts and waves count
assert.ok(P.distance(c(8, 0, 9), c(8, 0, 14)) > 1);
assert.ok(P.distance(c(8, 0, null, 0.3), c(8, 0, null, 1.5)) > 1);
assert.equal(P.distance(c(8, 0, null, 0.3), c(8, 0)), 0);
ok('gustiness and wave height make days different (when both are known)');

// 6. best window of the day
const now = new Date(); now.setHours(12, 0, 0, 0);
const hours = Array.from({ length: 12 }, (_, i) => ({ ts: now.getTime() + i * 3600e3, ...c(i >= 6 && i <= 8 ? 9 : 3, 260), day: i < 9 }));
const best = P.bestToday(spot, hours, [], now.getTime());
assert.ok(best && new Date(best.start).getHours() === 18 && !best.now, best);
ok('best window today: found at 18:00 when now is too light');

// 7. the window learns
const learn = [smp(4.5, 260, 5), smp(5, 255, 4), smp(9, 0, 4), smp(9, 5, 5), smp(9, 90, 2), smp(9, 92, 1)];
const ch = P.learnWindow(spot, learn);
assert.ok(ch && ch.dirs.includes('N') && ch.min < 6, ch);
assert.equal(P.learnWindow(spot, learn.slice(0, 3)), null);
ok('after enough sessions the wind window widens to what worked (N added, lower minimum)');

// 8. tide hint
const th = P.bestTide([{ rating: 5, tide: 'High', tideMove: 'Rising' }, { rating: 4, tide: 'High', tideMove: 'Falling' }, { rating: 2, tide: 'Low' }]);
assert.equal(th.tide, 'High'); assert.equal(th.move, null);
ok('tide: the tide most great sessions had');
console.log(`${n} prediction checks passed`);
