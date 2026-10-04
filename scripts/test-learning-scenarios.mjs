/** Count reconciliation and long-term user behavior, through validation + the real learning controller. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { compileTests } from './compile-tests.mjs';
import { HOUR, DAY, EPOCH, testSpot, savedDay, loggedSession, diary, fourSessions, history, conditions } from './learning-fixtures.mjs';

const require = compileTests();
const P = require('./predict.js');
const T = require('./learn/trees.js');
const { createLearningController } = require('./controllers/learning.js');
const { normalise, importJson } = require('./storage.js');
const { replaceEntity } = require('./diary/commands.js');
const { mergeData } = require('./diary/merge.js');
const rows = [];
function evaluate(name, raw, expected, inspect = () => {}) {
    const data = normalise(JSON.parse(JSON.stringify(raw)));
    const controller = createLearningController();
    const state = controller.update(data, 0);
    const actual = data.spots.flatMap(spot => state.learned.get(spot.id).map(model => {
        const exclusions = data.sessions.filter(session => session.spotId === spot.id && P.sportOf(spot, session) === model.sport)
            .flatMap(session => {
                const result = P.exampleOf(spot, session, data.snapshots, state.models.get(spot.id));
                return typeof result === 'string' ? [{ id: session.id, reason: result }] : [];
            });
        return { spot: spot.id, sport: model.sport, outings: model.outings, great: model.great,
            checked: model.local.filter(example => example.kind === 'checked').length, exclusions,
            model: state.models.get(spot.id), result: P.rate(model, P.toFeatures(conditions())), treeEligible: T.treesEligible(model.local) };
    }));
    assert.deepEqual(actual.map(({ spot, sport, outings, great }) => [spot, sport, outings, great]), expected, name);
    // Cached application results must agree with uncached extraction, including after JSON reload.
    for (const spot of data.spots) {
        const direct = P.learnSpot(spot, data.spots, data.sessions, data.snapshots, state.models.get(spot.id));
        assert.deepEqual(state.learned.get(spot.id), direct, `${name}: cached/direct parity`);
    }
    inspect(actual, data, controller, state);
    rows.push({ name, stored: data.sessions.length, actual });
    console.log(`PASS ${name}: ${actual.map(row => `${row.spot}/${row.sport} ${row.outings} outings, ${row.great} great`).join('; ')}`);
    return { data, controller, state };
}
const single = (n, g) => [['s', 'Windsurf', n, g]];
evaluate('Four outings on one saved day, two rated 4+', fourSessions(), single(4, 2));
{
    const data = fourSessions(); data.snapshots[0].savedAt = data.sessions[0].date;
    evaluate('Forecast saved exactly at first start is eligible', data, single(4, 2));
    data.snapshots[0].savedAt = 0;
    evaluate('Unknown legacy capture time cannot teach', data, single(0, 0), actual => assert.ok(actual[0].exclusions.every(item => item.reason === 'saved after start')));
}
for (const [name, alter, reason] of [
    ['One great outing has no linked forecast', (data) => {data.sessions[3].snapshotId = null;}, 'no forecast'],
    ['One great outing links a deleted forecast', (data) => {data.sessions[3].snapshotId = 'deleted';}, 'no forecast'],
    ['One great outing starts before the forecast was saved', (data) => {data.snapshots[0].savedAt = EPOCH + 9 * HOUR; data.sessions[3].date = EPOCH + 8 * HOUR; data.sessions[3].start = '08:00'; data.sessions[3].end = '09:00'; data.sessions[0].date = EPOCH + 16 * HOUR; data.sessions[0].start = '16:00'; data.sessions[0].end = '17:00';}, 'saved after start'],
    ['One great outing falls outside the saved day', (data) => {data.sessions[3].date += 2 * DAY;}, 'not covered'],
    ['One great outing uses a forecast at another place', (data) => {const sn = structuredClone(data.snapshots[0]); sn.id = 'far'; sn.spotId = null; sn.lat = 40; data.snapshots.push(sn); data.sessions[3].snapshotId = sn.id;}, 'other place'],
    ['One great outing lacks the selected model', (data) => {const sn = structuredClone(data.snapshots[0]); sn.id = 'gfs-only'; sn.series.models = { gfs: sn.series.models.ecmwf }; data.snapshots.push(sn); data.sessions[3].snapshotId = sn.id;}, 'model missing'],
    ['One great outing has missing wind', (data) => {const sn = structuredClone(data.snapshots[0]); sn.id = 'no-wind'; sn.series.models.ecmwf.wind.fill(null); data.snapshots.push(sn); data.sessions[3].snapshotId = sn.id;}, 'missing core'],
    ['One great outing crosses a forecast gap', (data) => {const sn = structuredClone(data.snapshots[0]); sn.id = 'gap'; sn.series.ts = sn.series.ts.map((ts, k) => ts + (k >= 15 ? 2 * HOUR : 0)); data.snapshots.push(sn); data.sessions[3].snapshotId = sn.id; data.sessions[3].end = '18:00';}, 'gap'],
    ['One great outing has a malformed imported forecast', (data) => {const sn = structuredClone(data.snapshots[0]); sn.id = 'broken'; sn.series.models.ecmwf.wind = []; data.snapshots.push(sn); data.sessions[3].snapshotId = sn.id;}, 'not covered'],
]) {
    const data = fourSessions(); alter(data);
    evaluate(name, data, single(3, 1), actual => assert.equal(actual[0].exclusions[0].reason, reason));
}
{
    const data = fourSessions(); data.spots[0].sports.push('Wing'); data.sessions[3].sport = 'Wing';
    evaluate('Four outings split between Windsurf and Wing', data, [...single(3, 1), ['s', 'Wing', 1, 1]]);
}
{
    const data = fourSessions(); data.spots.push(testSpot({ id: 'away', lat: 40 })); data.sessions[3].spotId = 'away';
    const sn = savedDay('away-sn', EPOCH, {}, { spotId: 'away', lat: 40 }); data.snapshots.push(sn); data.sessions[3].snapshotId = sn.id;
    evaluate('Four outings split between distant spots', data, [...single(3, 1), ['away', 'Windsurf', 1, 1]]);
}
{
    const data = fourSessions(); data.sessions[3].spotId = null;
    evaluate('Unlinked outing stays in the diary', data, single(3, 1));
    const checked = fourSessions(); checked.sessions[3] = { ...checked.sessions[3], checked: true, rating: 2 };
    evaluate('Did not go is a preference, not an outing', checked, single(3, 1), actual => assert.equal(actual[0].checked, 1));
}
evaluate('Start-only outings still teach', { ...fourSessions(), sessions: fourSessions().sessions.map(session => ({ ...session, end: '' })) }, single(4, 2), (_, data, __, state) => {
    assert.ok(state.learned.get('s')[0].local.every(example => example.from.limited));
});
{
    const sn = savedDay('overnight');
    const session = loggedSession('overnight', sn, 5, { date: EPOCH + 22 * HOUR, start: '22:00', end: '01:00' });
    // Extend the saved series to cover the whole outing, rather than inventing an end outside its window.
    sn.series.ts = sn.series.ts.map(ts => ts + 2 * HOUR);
    evaluate('Overnight outing with complete coverage', diary([testSpot()], [session], [sn]), single(1, 1));
    const start = Date.UTC(2026, 9, 24, 23);
    const dst = savedDay('dst', start - 6 * HOUR);
    evaluate('Prague autumn DST outing', diary([testSpot()], [loggedSession('dst', dst, 4, { date: start, start: '01:00', end: '04:00', tz: 'Europe/Prague' })], [dst]), single(1, 1), (_, data, __, state) => {
        assert.equal((P.outingTimes(data.sessions[0]).end - start) / HOUR, 4);
        assert.equal(state.learned.get('s')[0].local[0].from.hours, 5);
    });
    const legacy = { ...sn, id: 'legacy', series: undefined, ts: EPOCH + 12 * HOUR,
        models: [{ model: 'ecmwf', ts: EPOCH + 12 * HOUR, ...conditions() }] };
    evaluate('Legacy single-hour forecast and no start clock', diary([testSpot()], [loggedSession('old', sn, 4, { snapshotId: 'legacy', date: legacy.ts, start: '', end: '' })], [legacy]), single(1, 1));
}
for (const [name, ratings, expectedLevel] of [
    ['Four poor outings do not produce Good', [1, 2, 1, 2], 0],
    ['Four outings with two great are capped at Good', [3, 4, 3, 5], 3],
    ['Four great outings can produce Great', [4, 4, 4, 4], 4],
    ['Six great outings with two epic can produce Epic', [5, 5, 4, 4, 4, 4], 5],
]) {
    const sn = savedDay('ratings');
    evaluate(name, diary([testSpot()], ratings.map((rating, k) => loggedSession(`rating-${k}`, sn, rating)), [sn]), single(ratings.length, ratings.filter(rating => rating >= 4).length), actual => assert.equal(actual[0].result.level, expectedLevel));
}
evaluate('No history and no wind window', diary(), single(0, 0), actual => assert.equal(actual[0].result.level, 0));
evaluate('No history with a user wind window', diary([testSpot({ windUnknown: false })]), single(0, 0), actual => {
    assert.equal(actual[0].result.level, 3); assert.equal(actual[0].result.source, 'user range');
});
{
    const data = history(8, () => 5, { id: 'near', lat: 36.086 }); data.spots.unshift(testSpot());
    // Forecast coordinates follow the nearby spot.
    data.snapshots.forEach(sn => {sn.lat = 36.086;});
    evaluate('Nearby outings do not inflate local counts or evidence', data, [...single(0, 0), ['near', 'Windsurf', 8, 8]], actual => {
        assert.equal(actual[0].result.level, 0); assert.equal(actual[0].result.support, 0);
    });
    const surf = fourSessions(); surf.spots[0].sports = ['Surf']; surf.sessions.forEach(session => {session.sport = 'Surf';});
    evaluate('Surf outings with swell and period', surf, [['s', 'Surf', 4, 2]]);
    surf.snapshots[0].series.waves = null;
    evaluate('Surf outings without waves are stored but do not teach', surf, [['s', 'Surf', 0, 0]], actual => assert.ok(actual[0].exclusions.every(item => item.reason === 'missing core')));
    const custom = fourSessions(); custom.spots[0].sports = ['Sailing']; custom.sessions.forEach(session => {session.sport = 'Sailing';});
    evaluate('Custom sport has independent learning', custom, [['s', 'Sailing', 4, 2]]);
}

// Use the same controller through saves/edits, matching application immutable-array commands.
{
    const full = normalise(fourSessions()); let data = { ...full, sessions: [] };
    const controller = createLearningController(); const steps = [];
    const check = (label, outings, great) => {
        const model = controller.update(data, 0).learned.get('s')[0];
        assert.deepEqual([model.outings, model.great], [outings, great], label);
        assert.deepEqual(model, P.learnSpot(data.spots[0], data.spots, data.sessions, data.snapshots, 'ecmwf')[0]);
        steps.push({ label, outings, great });
    };
    full.sessions.forEach((session, k) => {data.sessions = replaceEntity(data.sessions, session); check(`Save ${k + 1}`, k + 1, [0, 1, 1, 2][k]);});
    const prior = controller.update(data, 0); const before = { ...controller.stats };
    data.sessions = replaceEntity(data.sessions, { ...data.sessions[0], notes: 'Notes only' });
    assert.equal(controller.update(data, 0), prior); assert.deepEqual(controller.stats, before);
    data.sessions = replaceEntity(data.sessions, { ...data.sessions[0], rating: 5 }); check('Edit rating', 4, 3);
    const removed = data.sessions[3]; data.sessions = data.sessions.filter(session => session.id !== removed.id); check('Delete', 3, 2);
    data.sessions = replaceEntity(data.sessions, removed); check('Undo', 4, 3);
    data.sessions = replaceEntity(data.sessions, { ...removed, snapshotId: null }); check('Unlink forecast', 3, 2);
    data.sessions = replaceEntity(data.sessions, removed); check('Relink forecast', 4, 3);
    data.snapshots = data.snapshots.map(sn => ({ ...sn, savedAt: EPOCH + 11 * HOUR })); check('Change capture time', 2, 1);
    data.snapshots = full.snapshots; check('Restore capture time', 4, 3);
    data = normalise(JSON.parse(JSON.stringify(data))); check('Reload', 4, 3);
    const file = { size: 1000, text: async () => JSON.stringify(data) };
    data = await importJson(file, data); check('Reimport same diary without duplicating logs', 4, 3);
    data = mergeData(data, data); check('Two-tab identical merge', 4, 3);
    rows.push({ name: 'Sequential save/edit/delete/undo/reload/import/merge', steps });
    console.log('PASS sequential diary changes: every count refreshes; notes reuse cached models');
}

{
    const data = history(12, k => k % 2 ? 1 : 5);
    data.snapshots.forEach((sn, k) => {
        const base = sn.series.models.ecmwf;
        base.wind.fill(k % 4 < 2 ? 16 : 9);
        if (k < 11) {sn.series.models.gfs = { ...structuredClone(base), wind: base.wind.map(() => k % 2 ? 16 : 9) };}
    });
    evaluate('Better model switch excludes one old ECMWF-only outing', data, single(11, 6), actual => {
        assert.equal(actual[0].model, 'gfs'); assert.equal(actual[0].exclusions[0].reason, 'model missing');
    });
    const short = { ...data, sessions: data.sessions.slice(0, 8) };
    evaluate('Eight outings keep the base forecast model', short, single(8, 4), actual => assert.equal(actual[0].model, 'ecmwf'));
    const equipment = history(8, () => 4); equipment.sessions.forEach(session => {session.gearIds = ['sail'];});
    evaluate('Eight outings unlock a supported gear hint', equipment, single(8, 8), (_, __, ___, state) => {
        assert.equal(P.gearHints(state.learned.get('s'))[0].sessions, 8);
    });
    evaluate('Seven outings do not unlock a gear hint', { ...equipment, sessions: equipment.sessions.slice(0, 7) }, single(7, 7), (_, __, ___, state) => {
        assert.deepEqual(P.gearHints(state.learned.get('s')), []);
    });
}

for (const [count, overrides, outcome, eligible] of [
    [99, {}, undefined, false], [100, {}, undefined, true], [120, {}, () => 5, false],
    [300, {}, undefined, true], [600, {}, undefined, true],
]) {
    evaluate(`Long-term ${count} outings${outcome ? ', all epic' : ', mixed results'}`, history(count, outcome, overrides), single(count, outcome ? count : Math.floor(count / 2)), (actual, _, __, state) => {
        assert.equal(actual[0].treeEligible, eligible);
        const model = state.learned.get('s')[0];
        assert.equal(P.rate(model, P.toFeatures(conditions({ wind: 18 }))).level, outcome ? 5 : 0);
        assert.ok(actual[0].result.support <= 10, 'prediction uses at most ten neighbors; summary counts the whole history');
        if (eligible) {
            // Exact repeatable clusters are already solved by neighbors: trees must stay off.
            assert.equal(T.trainTrees(model.sport, model.local, model.nearby, model.prior), null);
        }
    });
}
{
    const clustered = history(120); clustered.sessions = clustered.sessions.map((session, k) => ({ ...session,
        date: EPOCH + Math.floor(k / 6) * DAY + 12 * HOUR, snapshotId: clustered.snapshots[Math.floor(k / 6)].id }));
    evaluate('120 outings on only 20 days do not enable trees', clustered, single(120, 60), actual => assert.equal(actual[0].treeEligible, false));
    const checked = history(120); checked.sessions.forEach((session, k) => {if (k % 2 === 0) {session.checked = true;}});
    evaluate('120 logs including 60 did-not-go days', checked, single(60, 60), actual => {assert.equal(actual[0].checked, 60); assert.equal(actual[0].treeEligible, false);});
    const multi = diary(); multi.spots = [testSpot({ sports: ['Windsurf', 'Wing', 'Surf'] }), testSpot({ id: 'holiday', lat: 40 })];
    for (let k = 0; k < 600; k++) {
        const holiday = k % 4 === 3; const sn = savedDay(`multi-sn-${k}`, EPOCH + k * DAY, { wind: k % 2 ? 9 : 18 },
            { spotId: holiday ? 'holiday' : 's', lat: holiday ? 40 : 36.068 });
        const sport = holiday ? 'Windsurf' : ['Windsurf', 'Wing', 'Surf'][k % 4];
        multi.snapshots.push(sn); multi.sessions.push(loggedSession(`multi-se-${k}`, sn, k % 2 ? 5 : 2, { sport }));
    }
    evaluate('600 outings, two spots and three sports over 20 months', multi,
        [['s', 'Windsurf', 150, 0], ['s', 'Wing', 150, 150], ['s', 'Surf', 150, 0], ['holiday', 'Windsurf', 150, 150]]);
    const drift = history(120, k => k < 60 ? 5 : 1); drift.snapshots.forEach(sn => {sn.series.models.ecmwf.wind.fill(9);});
    evaluate('Changed preferences: 60 old epic, 60 recent poor in identical conditions', drift, single(120, 60), (actual, _, __, state) => {
        const model = state.learned.get('s')[0]; const reversed = { ...model, local: [...model.local].reverse() };
        const a = P.rate(model, P.toFeatures(conditions())); const b = P.rate(reversed, P.toFeatures(conditions()));
        assert.equal(a.level, 5); assert.equal(b.level, 0);
        actual[0].reverseOrderResult = b;
    });
}
{
    const data = history(120, k => { const wind = 4 + (k * 7) % 14; return wind >= 9 && wind <= 12 && k % 4 ? 5 : wind >= 7 && k % 4 ? 3 : 1; }, { windUnknown: false, dirs: ['W', 'SW'] });
    data.snapshots = data.snapshots.map((sn, k) => savedDay(sn.id, EPOCH + k * DAY,
        { wind: 4 + (k * 7) % 14, dir: k % 4 ? 260 : 90, gust: 11, waves: 0.8, period: 6, swell: null, power: null }));
    const { state } = evaluate('120 varied outings: trees must earn activation', data, single(120, data.sessions.filter(session => session.rating >= 4).length));
    const model = state.learned.get('s')[0]; const trained = T.trainTrees(model.sport, model.local, model.nearby, model.prior);
    assert.ok(trained, 'fixture earns tree activation');
    assert.ok(trained.check.heldOut >= 20 && trained.check.maeTrees <= 0.95 * trained.check.maeSimilar);
    assert.equal(await P.trainTreesInBackground([model]), true);
    const activated = P.learnSpot(data.spots[0], data.spots, data.sessions, data.snapshots, 'ecmwf')[0];
    assert.ok(activated.trees); assert.equal(P.rate(activated, P.toFeatures(conditions({ wind: 10, dir: 260 }))).source, 'boosted trees');
    assert.equal(P.rate(activated, P.toFeatures(conditions({ wind: 40 }))).level, 0);
    const edited = { ...data, sessions: replaceEntity(data.sessions, { ...data.sessions[0], rating: 5 }) };
    assert.equal(P.learnSpot(edited.spots[0], edited.spots, edited.sessions, edited.snapshots, 'ecmwf')[0].trees, null);
    rows.push({ name: 'Tree activation, outside coverage and rating-edit invalidation', check: trained.check });
}
const out = process.argv[2] || '/tmp/spotlog-learning'; mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, 'results.json'), JSON.stringify({ scenarios: rows.length, node: process.version, rows }, null, 2) + '\n');
writeFileSync(path.join(out, 'four-valid.json'), JSON.stringify(fourSessions()));
const late = fourSessions(); const lateSnapshot = { ...structuredClone(late.snapshots[0]), id: 'late', savedAt: EPOCH + 15 * HOUR };
late.snapshots.push(lateSnapshot); late.sessions[3].snapshotId = lateSnapshot.id;
writeFileSync(path.join(out, 'four-one-late.json'), JSON.stringify(late));
writeFileSync(path.join(out, 'long-term.json'), JSON.stringify(history(600)));
console.log(`${rows.length} learning scenarios passed. Evidence: ${path.join(out, 'results.json')}`);
