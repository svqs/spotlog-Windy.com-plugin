import { normalise, emptyData } from './diary/validation';
export { normalise, emptyData, defaultSettings, DEFAULT_LAYERS } from './diary/validation';
export { mergeData } from './diary/merge';
import type { SpotlogData } from './types';

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
    const now = Math.max(Date.now(), (current.updatedAt || 0) + 1);
    const deleted = { ...(current.deleted || {}) };
    const revived = { ...(current.revived || {}) };
    const revisions = { ...(current.revisions || {}) };
    [...incoming.spots, ...incoming.snapshots, ...incoming.sessions, ...incoming.gear].forEach(x => { delete deleted[x.id]; revived[x.id] = now; revisions[x.id] = now; });
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
        revisions,
        settingsAt: current.settingsAt,
    };
};

export const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
