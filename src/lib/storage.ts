import type { SpotlogData, Settings } from './types';

export const KEY = 'windy-plugin-spotlog:v1';
/** Each Windy account gets its own diary in the browser (two people sharing a laptop don't mix) */
let activeKey = KEY;
export const storageKey = (): string => activeKey;
export const useWindyUser = (id: number | string | null | undefined): void => {
    activeKey = id ? `${KEY}:u${id}` : KEY;
    if (!id) {return;}
    try {
        // first time for this Windy account: take over a diary made before accounts were linked
        const legacy = localStorage.getItem(KEY);
        if (legacy && !localStorage.getItem(activeKey)) {
            localStorage.setItem(activeKey, legacy);
            localStorage.removeItem(KEY);
        }
    } catch {
        /* storage unavailable */
    }
};

export const DEFAULT_LAYERS = ['temp', 'waves', 'swell1', 'wavesPeriod', 'wavesPower'];

export const defaultSettings = (): Settings => ({
    wind: 'ms',
    height: 'm',
    temp: 'C',
    allModels: true,
    models: ['ecmwf'],
    layers: [...DEFAULT_LAYERS],
    mapSpots: true,
    mapSessions: true,
    spotView: 'tiles',
    phoneSheet: false,
    welcomed: false,
});

export const emptyData = (): SpotlogData => ({
    version: 1, spots: [], snapshots: [], sessions: [], gear: [], settings: defaultSettings(),
});

/* ---------- validation: everything that comes from storage, an import file or the account is checked ---------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const isObj = (x: Any) => !!x && typeof x === 'object' && !Array.isArray(x);
const str = (x: Any, max = 500): string => (typeof x === 'string' ? x.slice(0, max) : '');
const numOr = (x: Any, d: number | null): number | null => (typeof x === 'number' && isFinite(x) ? x : d);
const lat = (x: Any) => { const v = numOr(x, NaN as unknown as number) as number; return v >= -90 && v <= 90 ? v : null; };
const lon = (x: Any) => { const v = numOr(x, NaN as unknown as number) as number; return v >= -180 && v <= 180 ? v : null; };
const ids = (x: Any): string[] => (Array.isArray(x) ? x.filter(i => typeof i === 'string').slice(0, 200) : []);
const withId = (x: Any) => isObj(x) && typeof x.id === 'string' && x.id.length <= 80;
const DIR8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const cleanSpot = (s: Any) => {
    const la = lat(s.lat); const lo = lon(s.lon);
    if (la === null || lo === null) {return null;}
    return {
        id: s.id, name: str(s.name, 80) || 'Spot', lat: la, lon: lo, place: str(s.place, 120),
        sports: ids(s.sports).map(x => x.slice(0, 20)).slice(0, 8),
        dirs: ids(s.dirs).filter(d => DIR8.includes(d)),
        min: numOr(s.min, 6), max: numOr(s.max, 12), windUnknown: !!s.windUnknown, created: numOr(s.created, Date.now()),
    };
};
const cleanSnap = (s: Any) => {
    const la = lat(s.lat); const lo = lon(s.lon);
    if (la === null || lo === null || !Array.isArray(s.models)) {return null;}
    return { ...s, spotId: typeof s.spotId === 'string' ? s.spotId : null, lat: la, lon: lo, ts: numOr(s.ts, 0), savedAt: numOr(s.savedAt, 0),
        primary: str(s.primary, 30), note: str(s.note, 2000), models: s.models.filter(isObj).slice(0, 12) };
};
const cleanTrack = (t: Any) => {
    if (!isObj(t) || !Array.isArray(t.points)) {return null;}
    const points = t.points.filter((p: Any) => Array.isArray(p) && lat(p[0]) !== null && lon(p[1]) !== null).slice(0, 2000);
    return { points, start: numOr(t.start, null), end: numOr(t.end, null), distanceKm: numOr(t.distanceKm, 0), durationMin: numOr(t.durationMin, 0),
        maxSpeed: numOr(t.maxSpeed, null), source: str(t.source, 120) };
};
const cleanSession = (s: Any) => ({
    id: s.id, spotId: typeof s.spotId === 'string' ? s.spotId : null, lat: lat(s.lat) ?? undefined, lon: lon(s.lon) ?? undefined,
    snapshotId: typeof s.snapshotId === 'string' ? s.snapshotId : null, date: numOr(s.date, Date.now()),
    rating: Math.max(1, Math.min(5, Math.round(numOr(s.rating, 3) as number))), felt: numOr(s.felt, null),
    gusts: str(s.gusts, 30) || null, water: str(s.water, 30) || null,
    sport: str(s.sport, 20) || null,
    tide: ['Low', 'Mid', 'High'].includes(s.tide) ? s.tide : null, tideMove: ['Rising', 'Falling'].includes(s.tideMove) ? s.tideMove : null, gearIds: ids(s.gearIds), gear: str(s.gear, 300),
    start: /^\d\d:\d\d$/.test(s.start) ? s.start : '', end: /^\d\d:\d\d$/.test(s.end) ? s.end : '', notes: str(s.notes, 5000),
    track: cleanTrack(s.track), tz: str(s.tz, 60) || undefined,
});
const cleanGear = (g: Any) => ({ id: g.id, name: str(g.name, 80) || 'Gear', kind: str(g.kind, 30) || 'Other', sport: str(g.sport, 20) || undefined });
const list = <T>(x: Any, fn: (v: Any) => T | null, max: number): T[] =>
    (Array.isArray(x) ? x.filter(withId).slice(0, max).map(fn).filter((v): v is T => !!v) : []);

/** A delete and a later "bring back" (upload, undo) of the same id: the newer one wins */
const settle = (deleted: Record<string, number>, revived: Record<string, number>): [Record<string, number>, Record<string, number>] => {
    const d = { ...deleted };
    Object.entries(revived).forEach(([k, v]) => { if (d[k] !== undefined && v >= d[k]) {delete d[k];} });
    return [d, revived];
};
const latest = (a: Record<string, number> = {}, b: Record<string, number> = {}): Record<string, number> => {
    const out = { ...a };
    Object.entries(b).forEach(([k, v]) => (out[k] = Math.max(v, out[k] || 0)));
    return out;
};

export const normalise = (parsed: Any): SpotlogData => {
    const settings = { ...defaultSettings(), ...(isObj(parsed?.settings) ? parsed.settings : {}) };
    if (!['ms', 'kt', 'kmh', 'mph', 'bft'].includes(settings.wind)) {settings.wind = 'ms';}
    if (!['m', 'ft'].includes(settings.height)) {settings.height = 'm';}
    if (!['C', 'F'].includes(settings.temp)) {settings.temp = 'C';}
    settings.layers = ids(settings.layers);
    settings.allModels = settings.allModels !== false;
    settings.mapSpots = settings.mapSpots !== false;
    settings.mapSessions = settings.mapSessions !== false;
    settings.spotView = settings.spotView === 'list' ? 'list' : 'tiles';
    settings.phoneSheet = settings.phoneSheet === true;
    // the welcome is for someone new: a diary with anything in it has met spotlog already (diaries from before 0.11 had no mark)
    settings.welcomed = settings.welcomed === true || ['spots', 'sessions', 'snapshots', 'gear'].some(k => Array.isArray(parsed?.[k]) && parsed[k].length > 0);
    settings.models = ids(settings.models).length ? ids(settings.models) : ['ecmwf'];
    const cut = Date.now() - 90 * 864e5;
    const stamps = (x: Any): Record<string, number> => {
        const out: Record<string, number> = {};
        if (isObj(x)) {Object.entries(x).forEach(([k, v]) => { if (typeof v === 'number' && v > cut && k.length <= 80) {out[k] = v;} });}
        return out;
    };
    const [deleted, revived] = settle(stamps(parsed?.deleted), stamps(parsed?.revived));
    return {
        version: 1,
        spots: list(parsed?.spots, cleanSpot, 2000) as SpotlogData['spots'],
        snapshots: list(parsed?.snapshots, cleanSnap, 5000) as SpotlogData['snapshots'],
        sessions: list(parsed?.sessions, cleanSession, 10000) as SpotlogData['sessions'],
        gear: list(parsed?.gear, cleanGear, 500),
        settings,
        updatedAt: typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : 0,
        deleted,
        revived,
    };
};

/**
 * Merges two copies of the diary (this device and the account, or an import).
 * Items are matched by id; for the same id the copy from the newer document wins.
 * Anything deleted on either side (tombstones) stays deleted.
 */
export const mergeData = (a: SpotlogData, b: SpotlogData): SpotlogData => {
    const [older, newer] = (a.updatedAt || 0) > (b.updatedAt || 0) ? [b, a] : [a, b];
    // a delete in one copy removes the item, unless it was brought back later (an upload in another tab)
    const [deleted, revived] = settle(latest(older.deleted, newer.deleted), latest(older.revived, newer.revived));
    const merge = <T extends { id: string }>(x: T[], y: T[]): T[] => {
        const m = new Map(x.map(i => [i.id, i]));
        y.forEach(i => m.set(i.id, i));
        return [...m.values()].filter(i => !deleted[i.id]);
    };
    return {
        version: 1,
        spots: merge(older.spots, newer.spots),
        snapshots: merge(older.snapshots, newer.snapshots),
        sessions: merge(older.sessions, newer.sessions),
        gear: merge(older.gear, newer.gear),
        settings: newer.settings || older.settings,
        updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0),
        deleted,
        revived,
    };
};

export const load = (): SpotlogData => {
    try {
        const raw = localStorage.getItem(activeKey);
        return raw ? normalise(JSON.parse(raw)) : emptyData();
    } catch (e) {
        console.warn('[spotlog] could not read saved data', e);
        return emptyData();
    }
};

/** @returns false when the browser refused (storage full or blocked) */
export const save = (data: SpotlogData): boolean => {
    try {
        localStorage.setItem(activeKey, JSON.stringify(data));
        return true;
    } catch (e) {
        console.warn('[spotlog] could not save data', e);
        return false;
    }
};

/** Downloads everything as a JSON file */
export const exportJson = (data: SpotlogData): void => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotlog-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const MAX_IMPORT_MB = 25;

/** Merges an exported JSON file into the current data (items with the same id are replaced; imported items are "undeleted") */
export const importJson = async (file: File, current: SpotlogData): Promise<SpotlogData> => {
    if (file.size > MAX_IMPORT_MB * 1024 * 1024) {throw new Error(`That file is larger than ${MAX_IMPORT_MB} MB`);}
    const raw = JSON.parse(await file.text());
    // a spotlog copy has at least its lists of spots and sessions
    if (!raw || typeof raw !== 'object' || !(Array.isArray(raw.spots) || Array.isArray(raw.sessions))) {throw new Error('not a spotlog copy');}
    const incoming = normalise(raw);
    const merge = <T extends { id: string }>(a: T[], b: T[]): T[] => {
        const map = new Map(a.map(x => [x.id, x]));
        b.forEach(x => map.set(x.id, x));
        return [...map.values()];
    };
    // everything in the copy counts as brought back now: newer than any delete, here or in another open tab
    const now = Date.now();
    const deleted = { ...(current.deleted || {}) };
    const revived = { ...(current.revived || {}) };
    [...incoming.spots, ...incoming.snapshots, ...incoming.sessions, ...incoming.gear].forEach(x => { delete deleted[x.id]; revived[x.id] = now; });
    return {
        version: 1,
        spots: merge(current.spots, incoming.spots),
        snapshots: merge(current.snapshots, incoming.snapshots),
        sessions: merge(current.sessions, incoming.sessions),
        gear: merge(current.gear, incoming.gear),
        settings: current.settings,
        updatedAt: now,
        deleted,
        revived,
    };
};

export const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
