/** Synthetic diaries, shared by learning tests and browser checks. Never reads a user's diary. */
export const HOUR = 3600e3;
export const DAY = 24 * HOUR;
export const EPOCH = Date.UTC(2024, 0, 1);
export const testSpot = (overrides = {}) => ({
    id: 's', name: 'Test beach', lat: 36.068, lon: -5.697, sports: ['Windsurf'],
    dirs: ['W'], min: 6, max: 12, windUnknown: true, created: EPOCH, ...overrides,
});
export const conditions = (overrides = {}) => ({ wind: 9, gust: 12, dir: 270, temp: 20, rain: 0,
    waves: 1, swell: 1, period: 8, swellDir: 270, power: 10, ...overrides });
export function savedDay(id, from = EPOCH, values = {}, overrides = {}) {
    const ts = Array.from({ length: 25 }, (_, k) => from + k * HOUR);
    const rows = ts.map((_, k) => conditions(typeof values === 'function' ? values(k) : values));
    const col = key => rows.map(row => row[key]);
    return { id, spotId: 's', lat: 36.068, lon: -5.697, ts: from, savedAt: from - HOUR,
        primary: 'ecmwf', models: [], waves: null, series: { ts,
            models: { ecmwf: { wind: col('wind'), gust: col('gust'), dir: col('dir'), temp: col('temp'), rain: col('rain') } },
            waves: { model: 'ecmwfWaves', waves: col('waves'), wavesPeriod: col('period'), wavesPower: col('power'),
                wavesDir: col('dir'), swell1: col('swell'), swell1Period: col('period'), swell1Dir: col('swellDir') } }, ...overrides };
}
const clock = timestamp => new Date(timestamp).toISOString().slice(11, 16);
export const loggedSession = (id, snapshot, rating = 4, overrides = {}) => {
    const start = snapshot.series.ts[0] + 12 * HOUR;
    return { id, spotId: snapshot.spotId, snapshotId: snapshot.id, date: start, rating,
        sport: 'Windsurf', gear: '', gearIds: [], notes: '', start: clock(start), end: clock(start + HOUR), tz: 'UTC', ...overrides };
};
export const diary = (spots = [testSpot()], sessions = [], snapshots = []) => ({
    version: 1, spots, sessions, snapshots, gear: [], settings: { welcomed: true, worksOpen: true },
});
export function fourSessions() {
    const snapshot = savedDay('shared');
    return diary([testSpot({ windUnknown: false })], [3, 4, 3, 5].map((rating, k) => loggedSession(`four-${k}`, snapshot, rating,
        { date: EPOCH + (8 + k * 2) * HOUR, start: `${8 + k * 2}`.padStart(2, '0') + ':00', end: `${9 + k * 2}`.padStart(2, '0') + ':00' })), [snapshot]);
}
export function history(count, outcome = k => k % 2 ? 5 : 1, overrides = {}) {
    const snapshots = Array.from({ length: count }, (_, k) => savedDay(`history-sn-${k}`, EPOCH + k * DAY,
        { wind: k % 2 ? 9 : 18 }, { spotId: overrides.id || 's' }));
    return diary([testSpot(overrides)], snapshots.map((snapshot, k) => loggedSession(`history-se-${k}`, snapshot, outcome(k))), snapshots);
}
