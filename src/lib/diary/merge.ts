import { canonical } from './revisions';
import type { SpotlogData } from '../types';

function latest(a: Record<string, number> = {}, b: Record<string, number> = {}): Record<string, number> {
    const result = { ...a };
    Object.entries(b).forEach(([id, stamp]) => {result[id] = Math.max(stamp, result[id] || 0);});
    return result;
}

/** Entity revisions preserve independent edits. Legacy documents retain their old timestamp fallback. */
export function mergeData(a: SpotlogData, b: SpotlogData): SpotlogData {
    const deleted = latest(a.deleted, b.deleted);
    const revived = latest(a.revived, b.revived);
    Object.entries(revived).forEach(([id, stamp]) => {if (deleted[id] !== undefined && stamp >= deleted[id]) {delete deleted[id];}});
    const revisions = latest(a.revisions, b.revisions);
    function merge<T extends { id: string }>(first: T[], second: T[]): T[] {
        const items = new Map(first.map(item => [item.id, item]));
        for (const item of second) {
            const existing = items.get(item.id);
            const left = a.revisions?.[item.id] ?? a.updatedAt ?? 0;
            const right = b.revisions?.[item.id] ?? b.updatedAt ?? 0;
            if (!existing || right > left || (right === left && canonical(item) > canonical(existing))) {items.set(item.id, item); revisions[item.id] = right;}
            else {revisions[item.id] = left;}
        }
        first.forEach(item => {if (revisions[item.id] === undefined) {revisions[item.id] = a.revisions?.[item.id] ?? a.updatedAt ?? 0;} });
        return [...items.values()].filter(item => deleted[item.id] === undefined);
    }
    const leftSettings = a.settingsAt ?? a.updatedAt ?? 0;
    const rightSettings = b.settingsAt ?? b.updatedAt ?? 0;
    const settings = rightSettings > leftSettings || (rightSettings === leftSettings && canonical(b.settings) > canonical(a.settings)) ? b.settings : a.settings;
    return { version: 1, spots: merge(a.spots, b.spots), snapshots: merge(a.snapshots, b.snapshots),
        sessions: merge(a.sessions, b.sessions), gear: merge(a.gear, b.gear), settings,
        updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0), settingsAt: Math.max(leftSettings, rightSettings), deleted, revived, revisions };
}
