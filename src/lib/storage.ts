import type { SpotlogData, Settings } from './types';

const KEY = 'windy-plugin-spotlog:v1';

export const DEFAULT_LAYERS = ['temp', 'waves', 'swell1', 'wavesPeriod', 'wavesPower'];

export const defaultSettings = (): Settings => ({
    wind: 'ms',
    height: 'm',
    temp: 'C',
    allModels: true,
    layers: [...DEFAULT_LAYERS],
});

export const emptyData = (): SpotlogData => ({
    version: 1, spots: [], snapshots: [], sessions: [], gear: [], settings: defaultSettings(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const normalise = (parsed: any): SpotlogData => ({
    version: 1,
    spots: Array.isArray(parsed?.spots) ? parsed.spots : [],
    snapshots: Array.isArray(parsed?.snapshots) ? parsed.snapshots : [],
    sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
    gear: Array.isArray(parsed?.gear) ? parsed.gear : [],
    settings: { ...defaultSettings(), ...(parsed?.settings || {}) },
    updatedAt: typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : 0,
});

/** Union of two diaries by id (b wins for the same id). Used the first time a browser joins an account. */
export const mergeData = (a: SpotlogData, b: SpotlogData): SpotlogData => {
    const merge = <T extends { id: string }>(x: T[], y: T[]): T[] => {
        const m = new Map(x.map(i => [i.id, i]));
        y.forEach(i => m.set(i.id, i));
        return [...m.values()];
    };
    return {
        version: 1,
        spots: merge(a.spots, b.spots),
        snapshots: merge(a.snapshots, b.snapshots),
        sessions: merge(a.sessions, b.sessions),
        gear: merge(a.gear, b.gear),
        settings: b.settings || a.settings,
        updatedAt: Date.now(),
    };
};

export const load = (): SpotlogData => {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? normalise(JSON.parse(raw)) : emptyData();
    } catch (e) {
        console.warn('[spotlog] could not read saved data', e);
        return emptyData();
    }
};

export const save = (data: SpotlogData): void => {
    try {
        localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('[spotlog] could not save data', e);
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

/** Merges an exported JSON file into the current data (items with the same id are replaced) */
export const importJson = async (file: File, current: SpotlogData): Promise<SpotlogData> => {
    const incoming = normalise(JSON.parse(await file.text()));
    const merge = <T extends { id: string }>(a: T[], b: T[]): T[] => {
        const map = new Map(a.map(x => [x.id, x]));
        b.forEach(x => map.set(x.id, x));
        return [...map.values()];
    };
    return {
        version: 1,
        spots: merge(current.spots, incoming.spots),
        snapshots: merge(current.snapshots, incoming.snapshots),
        sessions: merge(current.sessions, incoming.sessions),
        gear: merge(current.gear, incoming.gear),
        settings: current.settings,
    };
};

export const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
