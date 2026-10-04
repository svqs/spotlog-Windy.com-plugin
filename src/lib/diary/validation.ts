import type { SpotlogData, Settings, Spot, Snapshot, Session, Gear, Track, ModelValue, WaveValue, DaySeries, Dir8 } from '../types';

export const DEFAULT_LAYERS = ['temp', 'waves', 'swell1', 'wavesPeriod', 'wavesPower'];
export const defaultSettings = (): Settings => ({ wind: 'ms', height: 'm', temp: 'C', allModels: true, models: ['ecmwf'],
    layers: [...DEFAULT_LAYERS], mapSpots: true, mapSessions: true, spotView: 'tiles', phoneSheet: false,
    welcomed: false, worksOpen: false });
export const emptyData = (): SpotlogData => ({ version: 1, spots: [], snapshots: [], sessions: [], gear: [], settings: defaultSettings() });

type RecordValue = Record<string, unknown>;
export function isRecord(value: unknown): value is RecordValue {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function text(value: unknown, max = 500): string {return typeof value === 'string' ? value.slice(0, max) : '';}
function number(value: unknown, fallback: number): number {return typeof value === 'number' && Number.isFinite(value) ? value : fallback;}
function timestamp(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 8.64e15 ? value : fallback;
}
function nullable(value: unknown): number | null {return typeof value === 'number' && Number.isFinite(value) ? value : null;}
function coordinate(value: unknown, max: number): number | null {
    const result = nullable(value);
    return result !== null && Math.abs(result) <= max ? result : null;
}
function strings(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map(item => item.slice(0, 200)).slice(0, 200) : [];
}
const DIRS: Dir8[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function directions(value: unknown): Dir8[] {return strings(value).filter((item): item is Dir8 => DIRS.includes(item as Dir8));}
function clock(value: unknown): string {return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '';}

function ranges(value: RecordValue): NonNullable<Spot['ranges']> {
    const result: NonNullable<Spot['ranges']> = {};
    for (const [sport, conditions] of Object.entries(value).slice(0, 8)) {
        if (!isRecord(conditions) || sport.length > 20 || sport === '__proto__') {continue;}
        const row: NonNullable<Spot['ranges']>[string] = {};
        for (const [key, limits] of Object.entries(conditions).slice(0, 12)) {
            if (!isRecord(limits) || key.length > 12 || key === '__proto__') {continue;}
            const lo = nullable(limits.lo); const hi = nullable(limits.hi);
            row[key] = { ...(lo === null ? {} : { lo }), ...(hi === null ? {} : { hi }),
                ...(Array.isArray(limits.dirs) ? { dirs: directions(limits.dirs) } : {}) };
        }
        result[sport] = row;
    }
    return result;
}

function cleanSpot(value: RecordValue, id: string): Spot | null {
    const lat = coordinate(value.lat, 90); const lon = coordinate(value.lon, 180);
    if (lat === null || lon === null) {return null;}
    return { id, name: text(value.name, 80) || 'Spot', lat, lon, place: text(value.place, 120),
        sports: strings(value.sports).map(item => item.slice(0, 20)).slice(0, 8), dirs: directions(value.dirs),
        min: number(value.min, 6), max: number(value.max, 12), windUnknown: value.windUnknown === true,
        created: timestamp(value.created, Date.now()), ...(isRecord(value.ranges) ? { ranges: ranges(value.ranges) } : {}),
        ...(typeof value.recommendationModel === 'string' && /^[A-Za-z0-9]{2,30}$/.test(value.recommendationModel)
            ? { recommendationModel: value.recommendationModel } : {}) };
}

function model(value: RecordValue): ModelValue {
    return { model: text(value.model, 30), ts: timestamp(value.ts, 0), wind: nullable(value.wind), gust: nullable(value.gust),
        dir: nullable(value.dir), temp: nullable(value.temp), rain: nullable(value.rain) };
}
const WAVE_COLUMNS = ['waves', 'wavesPeriod', 'wavesPower', 'wavesDir', 'swell1', 'swell1Period', 'swell1Dir'] as const;
function waves(value: unknown): WaveValue | null {
    if (!isRecord(value)) {return null;}
    return { model: text(value.model, 30), waves: nullable(value.waves), wavesPeriod: nullable(value.wavesPeriod),
        wavesPower: nullable(value.wavesPower), wavesDir: nullable(value.wavesDir), swell1: nullable(value.swell1),
        swell1Period: nullable(value.swell1Period), swell1Dir: nullable(value.swell1Dir) };
}

/** Reject structurally invalid series rather than treating partial forecast content as evidence. */
function series(value: unknown): DaySeries | undefined {
    if (!isRecord(value) || !Array.isArray(value.ts) || !value.ts.length || value.ts.length > 1000 || !isRecord(value.models)) {return undefined;}
    const ts = value.ts;
    if (ts.some((item, index) => timestamp(item, NaN) !== item || (index > 0 && item <= ts[index - 1]))) {return undefined;}
    const timestamps = ts as number[];
    const column = (items: unknown): (number | null)[] => timestamps.map((_time, index) => Array.isArray(items) ? nullable(items[index]) : null);
    const models: DaySeries['models'] = {};
    for (const [key, item] of Object.entries(value.models).slice(0, 32)) {
        if (!isRecord(item) || !/^[A-Za-z0-9]{2,30}$/.test(key) || !Array.isArray(item.wind)
            || !Array.isArray(item.dir) || item.wind.length !== ts.length || item.dir.length !== ts.length) {continue;}
        models[key] = { wind: column(item.wind), gust: column(item.gust), dir: column(item.dir), temp: column(item.temp), rain: column(item.rain) };
    }
    if (!Object.keys(models).length) {return undefined;}
    let waveSeries: DaySeries['waves'] = null;
    if (isRecord(value.waves)) {
        const columns = Object.fromEntries(WAVE_COLUMNS.map(key => [key, column((value.waves as RecordValue)[key])])) as Omit<NonNullable<DaySeries['waves']>, 'model'>;
        waveSeries = { model: text(value.waves.model, 30), ...columns };
    }
    let tide: DaySeries['tide'];
    if (isRecord(value.tide)) {
        const extremes = (items: unknown) => Array.isArray(items) ? items.filter((item): item is number => nullable(item) !== null).slice(0, 1000) : [];
        tide = { highs: extremes(value.tide.highs), lows: extremes(value.tide.lows),
            ...(Array.isArray(value.tide.highsM) ? { highsM: extremes(value.tide.highsM) } : {}),
            ...(Array.isArray(value.tide.lowsM) ? { lowsM: extremes(value.tide.lowsM) } : {}) };
    }
    return { ts: timestamps, models, waves: waveSeries, ...(tide ? { tide } : {}) };
}

function cleanSnapshot(value: RecordValue, id: string): Snapshot | null {
    const lat = coordinate(value.lat, 90); const lon = coordinate(value.lon, 180);
    if (lat === null || lon === null) {return null;}
    const parsedSeries = series(value.series);
    return { id, lat, lon, spotId: typeof value.spotId === 'string' ? value.spotId : null,
        ts: timestamp(value.ts, 0), savedAt: timestamp(value.savedAt, 0), primary: text(value.primary, 30), note: text(value.note, 2000),
        models: Array.isArray(value.models) ? value.models.filter(isRecord).slice(0, 32).map(model) : [], waves: waves(value.waves),
        ...(parsedSeries ? { series: parsedSeries } : {}),
        ...((value.series != null && !parsedSeries) || value.forecastInvalid === true ? { forecastInvalid: true } : {}) };
}
function track(value: unknown): Track | null {
    if (!isRecord(value) || !Array.isArray(value.points)) {return null;}
    const points: [number, number][] = [];
    for (const point of value.points.slice(0, 2000)) {
        if (!Array.isArray(point)) {continue;}
        const lat = coordinate(point[0], 90); const lon = coordinate(point[1], 180);
        if (lat !== null && lon !== null) {points.push([lat, lon]);}
    }
    return { points, start: value.start == null ? null : timestamp(value.start, 0), end: value.end == null ? null : timestamp(value.end, 0), distanceKm: number(value.distanceKm, 0),
        durationMin: number(value.durationMin, 0), maxSpeed: nullable(value.maxSpeed), source: text(value.source, 120) };
}
function cleanSession(value: RecordValue, id: string): Session {
    return { id, spotId: typeof value.spotId === 'string' ? value.spotId : null,
        lat: coordinate(value.lat, 90) ?? undefined, lon: coordinate(value.lon, 180) ?? undefined,
        snapshotId: typeof value.snapshotId === 'string' ? value.snapshotId : null, date: timestamp(value.date, Date.now()),
        rating: Math.max(1, Math.min(5, Math.round(number(value.rating, 3)))), sport: text(value.sport, 20) || null,
        ...(value.checked === true ? { checked: true } : {}), gearIds: strings(value.gearIds), gear: text(value.gear, 300),
        start: clock(value.start), end: clock(value.end), notes: text(value.notes, 5000), track: track(value.track), tz: text(value.tz, 60) || undefined };
}
function cleanGear(value: RecordValue, id: string): Gear {
    return { id, name: text(value.name, 80) || 'Gear', kind: text(value.kind, 30) || 'Other', sport: text(value.sport, 20) || undefined };
}

export function normalise(input: unknown): SpotlogData {
    const value = isRecord(input) ? input : {};
    const preferences = isRecord(value.settings) ? value.settings : {};
    const settings = defaultSettings();
    if (['ms', 'kt', 'kmh', 'mph', 'bft'].includes(String(preferences.wind))) {settings.wind = preferences.wind as Settings['wind'];}
    if (['m', 'ft'].includes(String(preferences.height))) {settings.height = preferences.height as Settings['height'];}
    if (['C', 'F'].includes(String(preferences.temp))) {settings.temp = preferences.temp as Settings['temp'];}
    settings.models = strings(preferences.models).length ? strings(preferences.models) : settings.models;
    if (Array.isArray(preferences.layers)) {settings.layers = strings(preferences.layers);}
    settings.allModels = preferences.allModels !== false;
    settings.mapSpots = preferences.mapSpots !== false;
    settings.mapSessions = preferences.mapSessions !== false;
    settings.spotView = preferences.spotView === 'list' ? 'list' : 'tiles';
    settings.phoneSheet = preferences.phoneSheet === true;
    settings.worksOpen = preferences.worksOpen === true;
    settings.welcomed = preferences.welcomed === true || ['spots', 'sessions', 'snapshots', 'gear'].some(key => Array.isArray(value[key]) && (value[key] as unknown[]).length > 0);
    // Keep duplicates as distinct recovered items; existing references continue to target the first id.
    const seen = new Set<string>();
    function list<T>(items: unknown, kind: string, clean: (row: RecordValue, id: string) => T | null, max: number): T[] {
        if (!Array.isArray(items)) {return [];}
        const result: T[] = [];
        items.slice(0, max).forEach((item, index) => {
            if (!isRecord(item)) {return;}
            let id = text(item.id, 80) || `recovered-${kind}-${index}`;
            let suffix = 0;
            const original = id;
            while (seen.has(id)) {id = `${original.slice(0, 55)}~recovered-${++suffix}`;}
            const cleaned = clean(item, id);
            if (cleaned) {seen.add(id); result.push(cleaned);}
        });
        return result;
    }
    function stamps(items: unknown, minimum = -1): Record<string, number> {
        const result: Record<string, number> = {};
        if (isRecord(items)) {for (const [key, stamp] of Object.entries(items)) {
            if (key.length <= 80 && key !== '__proto__' && typeof stamp === 'number' && Number.isFinite(stamp) && stamp >= 0 && stamp <= 8.64e15 && stamp > minimum) {result[key] = stamp;}
        }}
        return result;
    }
    const cutoff = Date.now() - 90 * 864e5;
    const deleted = stamps(value.deleted, cutoff); const revived = stamps(value.revived, cutoff);
    Object.entries(revived).forEach(([id, stamp]) => {if (deleted[id] !== undefined && stamp >= deleted[id]) {delete deleted[id];}});
    return { version: 1, spots: list(value.spots, 'spot', cleanSpot, 2000), snapshots: list(value.snapshots, 'snapshot', cleanSnapshot, 5000),
        sessions: list(value.sessions, 'session', cleanSession, 10000), gear: list(value.gear, 'gear', cleanGear, 500), settings,
        updatedAt: Math.max(0, timestamp(value.updatedAt, 0)), revisions: stamps(value.revisions), settingsAt: Math.max(0, timestamp(value.settingsAt, timestamp(value.updatedAt, 0))), deleted, revived };
}
