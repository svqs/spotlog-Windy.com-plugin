import assert from 'node:assert/strict';
import { compileTests } from './compile-tests.mjs';

const require = compileTests();
const { normalise, emptyData } = require('./diary/validation.js');
const { baseline, commitChanges, commitSettings, settingsBaseline, canonical } = require('./diary/revisions.js');
const { mergeData } = require('./diary/merge.js');
const { editSpot } = require('./diary/commands.js');
const { createLifetime } = require('./controllers/lifetime.js');
const { createRequestCache } = require('./controllers/requests.js');
const { createSyncController } = require('./controllers/sync.js');
const { createLearningController } = require('./controllers/learning.js');
const { SyncConflict, cloudAvailable, pull, push, removeRemote } = require('./cloud.js');
const { exampleOf } = require('./predict.js');
const { clockInstant, dayKey } = require('./time.js');
const { toHeight, fromHeight, toTemperature, fromTemperature } = require('./units.js');
const { createForecastController } = require('./controllers/forecasts.js');
const clone = data => structuredClone(data);
const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const spot = { id: 's', name: 'Spot', lat: 0, lon: 0, sports: ['Windsurf'], dirs: ['W'], min: 6, max: 12, created: 1, recommendationModel: 'gfs', ranges: { Windsurf: { wind: { lo: 6 } } } };

{
    // Browser-only production must not send diary data when no backend is configured.
    const previousFetch = globalThis.fetch;
    globalThis.fetch = () => {throw new Error('Unexpected diary network request');};
    try {
        assert.equal(cloudAvailable(), false);
        const auth = { id: 12345, token: null };
        assert.equal(await pull(auth), null);
        assert.equal(await push(auth, emptyData(), 0), 0);
        await removeRemote(auth);
    } finally {globalThis.fetch = previousFetch;}
}

{
    const edited = editSpot(spot, { ...spot, name: 'Renamed', created: 9, recommendationModel: undefined });
    // Commands accept only editable patches from the form; an absent metadata field cannot delete it.
    const form = { ...spot, name: 'Renamed' }; delete form.recommendationModel; delete form.ranges;
    assert.equal(editSpot(spot, form).recommendationModel, 'gfs');
    assert.deepEqual(editSpot(spot, form).ranges, spot.ranges);
    assert.equal(edited.created, 1);
}
{
    const original = normalise({ ...emptyData(), gear: [{ id: 'g1', name: 'one', kind: 'Board' }, { id: 'g2', name: 'two', kind: 'Board' }], updatedAt: 1 });
    const left = clone(original); left.gear[0].name = 'one edited';
    const right = clone(original); right.gear[1].name = 'two edited';
    const a = commitChanges(left, baseline(original), 2);
    const b = commitChanges(right, baseline(original), 3);
    const merged = mergeData(a, b);
    assert.deepEqual(merged.gear.map(item => item.name), ['one edited', 'two edited']);
    assert.equal(canonical(mergeData(a, b)), canonical(mergeData(b, a)));
    const tied = clone(a); tied.gear[0].name = 'tie';
    assert.equal(canonical(mergeData(a, tied)), canonical(mergeData(tied, a)));
    const deleted = clone(merged); deleted.gear = deleted.gear.filter(item => item.id !== 'g1');
    const removed = commitChanges(deleted, baseline(merged), 4);
    assert.equal(mergeData(removed, a).gear.some(item => item.id === 'g1'), false);
    const undone = commitChanges(clone(merged), baseline(removed), 5);
    assert.equal(mergeData(undone, removed).gear.length, 2);
    assert.ok(undone.revived.g1 > removed.deleted.g1);
    const preferences = clone(original); preferences.settings.wind = 'kt';
    const changedSettings = commitChanges(preferences, baseline(original), 5);
    assert.equal(mergeData(changedSettings, b).settings.wind, 'kt');
    assert.equal(normalise(clone(merged)).gear.length, 2);
    const onlySettings = commitSettings({ ...original, settings: { ...original.settings, wind: 'kt' } }, baseline(original), 6);
    assert.equal(onlySettings.revisions.g1, 1, 'preferences cannot restamp unchanged legacy entities');
    assert.equal(settingsBaseline(onlySettings, baseline(original)).items.get('g1'), baseline(original).items.get('g1'));
}
{
    const parsed = normalise({ spots: [spot], snapshots: [{ id: 'broken', lat: 0, lon: 0, models: [], savedAt: 1, spotId: 's', series: { ts: [] }, note: 'keep me' }],
        sessions: [{ id: 'se', spotId: 's', snapshotId: 'broken', date: 1000, rating: 4, start: '99:99', end: '13:90', notes: 'keep this too' }, { id: 'se', date: 1000 }, { id: '', date: 1000 }] });
    assert.equal(parsed.sessions.length, 3);
    assert.equal(new Set(parsed.sessions.map(item => item.id)).size, 3);
    assert.equal(parsed.sessions[0].start, '');
    assert.equal(parsed.snapshots[0].forecastInvalid, true);
    assert.equal(exampleOf(spot, parsed.sessions[0], parsed.snapshots, 'gfs'), 'not covered');
    const reloaded = normalise(JSON.parse(JSON.stringify(parsed)));
    assert.equal(reloaded.snapshots[0].note, 'keep me');
    assert.equal(reloaded.sessions[0].notes, 'keep this too');
}
{
    const lifetime = createLifetime();
    const old = lifetime.capture('track'); const current = lifetime.capture('track');
    assert.equal(old(), false); assert.equal(current(), true);
    lifetime.invalidate(); assert.equal(current(), false);
    const next = lifetime.capture(); lifetime.dispose(); assert.equal(next(), false);
    const cache = createRequestCache(1000, 2);
    let calls = 0; const fetcher = async () => ++calls;
    const first = cache.get('one', fetcher); assert.equal(cache.get('one', fetcher), first);
    assert.equal(await first, 1);
    await cache.get('two', fetcher); await cache.get('three', fetcher); assert.equal(cache.size, 2);
    await assert.rejects(cache.get('bad', async () => {throw new Error('offline');}));
    assert.equal(await cache.get('bad', fetcher), 4);
}
{
    let auth = { id: 1, token: 'a' }; let document = emptyData();
    const delayed = deferred(); const writes = []; const states = [];
    const controller = createSyncController({ auth: () => auth, read: () => document,
        accept: value => {document = value;}, state: value => states.push(value),
        pull: () => delayed.promise, push: async (...args) => {writes.push(args); return 1;} });
    const pending = controller.sync(); await Promise.resolve();
    controller.reset(); auth = { id: 2, token: 'b' }; document = { ...emptyData(), gear: [{ id: 'b', name: 'B', kind: 'Board' }] };
    delayed.resolve({ data: { ...emptyData(), gear: [{ id: 'a', name: 'A', kind: 'Board' }] }, revision: 1, updatedAt: 1 });
    await pending;
    assert.equal(document.gear[0].name, 'B'); assert.equal(writes.length, 0);
    controller.dispose();
}
{
    const pendingWrite = deferred(); let failures = 0;
    const controller = createSyncController({ auth: () => ({ id: 1, token: null }), read: emptyData, accept() {},
        state: value => {if (value === 'error') {failures++;}}, pull: async () => null, push: () => pendingWrite.promise });
    const pending = controller.sync(); await new Promise(resolve => setTimeout(resolve, 0));
    controller.dispose(); pendingWrite.reject(new Error('offline')); await pending;
    assert.equal(failures, 0, 'disposed writer cannot set status or schedule retries');
}
{
    let writes = 0; let concurrent = 0; let maximum = 0; let revision = 0;
    const document = emptyData();
    const controller = createSyncController({ auth: () => ({ id: 1, token: null }), read: () => document, accept() {}, state() {},
        pull: async () => ({ data: document, updatedAt: 0, revision }),
        push: async (_auth, _document, expected) => {
            concurrent++; maximum = Math.max(maximum, concurrent);
            await new Promise(resolve => setTimeout(resolve, 0)); concurrent--; writes++;
            if (writes === 1) {revision++; throw new SyncConflict();}
            assert.equal(expected, revision); return ++revision;
        } });
    await Promise.all([controller.sync(), controller.sync()]);
    assert.equal(maximum, 1); assert.equal(writes, 3); controller.dispose();
}
{
    const controller = createLearningController();
    const document = { ...emptyData(), spots: [spot, { ...spot, id: 'far', lat: 30 }] };
    const first = controller.update(document, 0); const counts = { ...controller.stats };
    const preferences = clone(document); preferences.settings.wind = 'kt';
    assert.equal(controller.update(preferences, 0), first);
    assert.deepEqual(controller.stats, counts);
    preferences.spots = preferences.spots.map(item => item.id === 's' ? { ...item, min: 7 } : item);
    controller.update(preferences, 0);
    assert.equal(controller.stats.skillEvaluations, counts.skillEvaluations + 1);
    assert.equal(controller.stats.spotEvaluations, counts.spotEvaluations + 1);
}
{
    const instant = clockInstant('2026-03-29', '03:30', 'Europe/Prague');
    assert.equal(new Date(instant).toISOString(), '2026-03-29T01:30:00.000Z');
    assert.equal(dayKey(clockInstant('2026-10-04', '00:30', 'Pacific/Kiritimati'), 'Pacific/Kiritimati'), '2026-10-04');
    assert.ok(Number.isNaN(clockInstant('2026-10-04', '99:99', 'UTC')));
    assert.equal(fromHeight(toHeight(1.37, 'ft'), 'ft'), 1.37);
    assert.ok(Math.abs(fromTemperature(toTemperature(-4.3, 'F'), 'F') + 4.3) < 1e-12);
    const invalidDate = normalise({ sessions: [{ id: 'date', date: 1e100 }] });
    assert.ok(Number.isFinite(Date.parse(new Date(invalidDate.sessions[0].date).toISOString())));
}
{
    let calls = 0;
    const source = { conditionsNow: async () => {calls++; return {wind: null, waves: null};}, hoursToday: async () => [], hoursBetween: async () => [], predictability: async () => ({}), tideToday: async () => ({day:null, needsPremium:false}), availableModels: async () => [] };
    const controller = createForecastController(source);
    await Promise.all([controller.now(0,0,'ecmwf',true),controller.now(0,0,'ecmwf',true)]);
    assert.equal(calls, 1); await controller.now(0,1,'ecmwf',true); assert.equal(calls, 2);
    await controller.now(0,0,'ecmwf',true); assert.equal(calls, 3, 'an unavailable response can recover on the next load');
    controller.clear(); assert.equal(controller.sizes.conditions, 0);
}
console.log('Core checks passed: entity preservation, concurrent edits, revisions, malformed diaries, lifetime, bounded requests, sync races/conflicts, learning invalidation.');
