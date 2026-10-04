import type { SpotlogData } from '../types';

/** Canonical content, for merge ties and immutable change baselines. */
export function canonical(value: unknown): string {
    if (Array.isArray(value)) {return '[' + value.map(canonical).join(',') + ']';}
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return '{' + Object.keys(record).filter(key => record[key] !== undefined).sort()
            .map(key => JSON.stringify(key) + ':' + canonical(record[key])).join(',') + '}';
    }
    return JSON.stringify(value) ?? 'null';
}

export function entities(data: SpotlogData) {
    return [...data.spots, ...data.snapshots, ...data.sessions, ...data.gear];
}

export interface DiaryBaseline { items: Map<string, string>; settings: string; at: number; deleted: Record<string, number>; revived: Record<string, number>; revisions: Record<string, number> }

export function baseline(data: SpotlogData): DiaryBaseline {
    return { items: new Map(entities(data).map(item => [item.id, canonical(item)])),
        settings: canonical(data.settings), at: data.updatedAt || 0, deleted: { ...data.deleted }, revived: { ...data.revived }, revisions: { ...data.revisions } };
}

/** Stamps only edits; serializing the baseline protects it from in-place Svelte mutations. */
export function commitChanges(data: SpotlogData, before: DiaryBaseline, clock = Date.now()): SpotlogData {
    const at = Math.max(clock, before.at + 1, (data.updatedAt || 0) + 1);
    const revisions = { ...before.revisions, ...data.revisions };
    const deleted = { ...before.deleted, ...data.deleted };
    const revived = { ...before.revived, ...data.revived };
    const current = new Set<string>();
    for (const item of entities(data)) {
        current.add(item.id);
        if (revisions[item.id] === undefined && before.items.has(item.id)) {revisions[item.id] = before.at;}
        if (before.items.get(item.id) !== canonical(item)) {revisions[item.id] = at;}
        if (deleted[item.id] !== undefined) {delete deleted[item.id]; revived[item.id] = at; revisions[item.id] = at;}
    }
    before.items.forEach((_content, id) => {if (!current.has(id)) {deleted[id] = at; revisions[id] = at;}});
    return { ...data, revisions, deleted, revived, updatedAt: at,
        settingsAt: before.settings === canonical(data.settings) ? (data.settingsAt ?? before.at) : at };
}

/** A settings command cannot edit entities; avoid reserializing every saved forecast on a units change. */
export function commitSettings(data: SpotlogData, before: DiaryBaseline, clock = Date.now()): SpotlogData {
    const at = Math.max(clock, before.at + 1, (data.updatedAt || 0) + 1);
    const revisions = { ...data.revisions };
    before.items.forEach((_content, id) => {if (revisions[id] === undefined) {revisions[id] = before.at;}});
    return { ...data, revisions, updatedAt: at, settingsAt: at };
}
export function settingsBaseline(data: SpotlogData, before: DiaryBaseline): DiaryBaseline {
    return { ...before, settings: canonical(data.settings), at: data.updatedAt || 0,
        deleted: { ...data.deleted }, revived: { ...data.revived }, revisions: { ...data.revisions } };
}
