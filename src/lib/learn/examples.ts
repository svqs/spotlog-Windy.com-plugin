/**
 * Training examples: one per real outing (or "Not worth it, didn't go" day), from the forecast that was saved
 * BEFORE it started. This is the only place sessions become learning data: the similar-sessions scorer,
 * the boosted trees, the "What works here" ranges and the walk-forward check all use these examples.
 */
import { distanceKm } from '../geo';
import { dayKey, outingTimes } from '../time';
export { dayKey, outingTimes } from '../time';
import { EXAMPLE } from './config';
import { hasCore, summarize, toFeatures, type Conditions, type Features } from './features';
import { tideAt } from './tide';
import type { DaySeries, Session, Snapshot, Spot } from '../types';

export interface Example {
    sessionId: string;
    spotId: string;
    sport: string;
    rating: number;
    /** an outing on the water, or a day you checked and didn't go (a weaker preference signal) */
    kind: 'outing' | 'checked';
    start: number;
    /** the local calendar day of the start ("2026-10-04"): outings of one day count together */
    day: string;
    /** the saved forecast summed up over the outing */
    x: Features;
    /** where the values come from (provenance; not stored in the diary) */
    from: { snapshotId: string; model: string; hours: number; limited: boolean };
    gearIds: string[];
    tide: string | null;
    tideMove: string | null;
}

/** Why a session doesn't teach (for tests and for explaining) */
export type Skip = 'rating' | 'no forecast' | 'saved after start' | 'other place' | 'model missing' | 'not covered' | 'gap' | 'missing core';

const HOUR = 3600e3;

/* ---------- time: the outing's start and end ---------- */

/* ---------- the saved forecast over the outing ---------- */

/** Forecast values at index i of a saved day, for one model (and the saved waves) */
const seriesAt = (sr: DaySeries, model: string, i: number): Conditions => {
    const m = sr.models[model];
    const w = sr.waves;
    return {
        wind: m.wind[i] ?? null, gust: m.gust[i] ?? null, dir: m.dir[i] ?? null, temp: m.temp[i] ?? null, rain: m.rain?.[i] ?? null,
        waves: w?.waves[i] ?? null, period: w?.wavesPeriod[i] ?? null, wavesDir: w?.wavesDir[i] ?? null, power: w?.wavesPower[i] ?? null,
        swell: w?.swell1[i] ?? null, swellPeriod: w?.swell1Period[i] ?? null, swellDir: w?.swell1Dir[i] ?? null,
    };
};

/** The saved hours inside the outing (or the hour nearest a start-only session); null when the outing isn't covered or has a gap */
function coveredHours(ts: number[], start: number, end: number | null): number[] | Skip {
    const nearestTo = (t: number) => ts.reduce((best, v, k) => (Math.abs(v - t) < Math.abs(ts[best] - t) ? k : best), 0);
    const near = (t: number): number[] | Skip => { const k = nearestTo(t); return ts.length && Math.abs(ts[k] - t) <= EXAMPLE.maxGapH * HOUR ? [k] : 'not covered'; };
    if (end === null) {return near(start);}
    const inside = ts.flatMap((t, k) => (t >= start && t <= end ? [k] : []));
    const points = [start, ...inside.map(k => ts[k]), end];
    if (points.some((t, k) => k && t - points[k - 1] > EXAMPLE.maxGapH * HOUR)) {return inside.length ? 'gap' : 'not covered';}
    return inside.length ? inside : near((start + end) / 2);
}

/** The sport a session teaches: its own when the spot has it, else the spot's first */
export const sportOf = (spot: Spot, s: Session): string => (s.sport && spot.sports.includes(s.sport) ? s.sport : spot.sports[0] || 'Other');

/** One session → one example, or why it can't teach */
const snapshotIndexes = new WeakMap<Snapshot[], Map<string, Snapshot>>();
function snapshotById(snapshots: Snapshot[], id: string): Snapshot | undefined {
    let index = snapshotIndexes.get(snapshots);
    if (!index) {index = new Map(snapshots.map(snapshot => [snapshot.id, snapshot])); snapshotIndexes.set(snapshots, index);}
    return index.get(id);
}

export function exampleOf(spot: Spot, s: Session, snapshots: Snapshot[], model: string): Example | Skip {
    if (!Number.isInteger(s.rating) || s.rating < 1 || s.rating > 5) {return 'rating';}
    const sn = s.snapshotId ? snapshotById(snapshots, s.snapshotId) : null;
    if (!sn) {return 'no forecast';}
    if (sn.forecastInvalid) {return 'not covered';}
    const { start, end, limited } = outingTimes(s);
    // only what you could have known beforehand: a forecast saved later stays in the diary but doesn't teach
    if (!(sn.savedAt > 0 && sn.savedAt <= start)) {return 'saved after start';}
    if (sn.spotId !== spot.id && distanceKm(sn, spot) > EXAMPLE.sameSpotKm) {return 'other place';}
    let x: Features;
    let hours = 1;
    if (sn.series) {
        if (!sn.series.models[model]) {return 'model missing';}
        const idx = coveredHours(sn.series.ts, start, end);
        if (typeof idx === 'string') {return idx;}
        x = summarize(idx.map(i => toFeatures(seriesAt(sn.series as DaySeries, model, i))));
        hours = idx.length;
    } else {
        // old single-hour saves: only when saved for (about) the start
        const m = sn.models.find(v => v.model === model);
        if (!m) {return 'model missing';}
        if (Math.abs(sn.ts - start) > EXAMPLE.maxGapH * HOUR) {return 'not covered';}
        const w = sn.waves;
        x = toFeatures({ ...m, waves: w?.waves ?? null, period: w?.wavesPeriod, wavesDir: w?.wavesDir, power: w?.wavesPower, swell: w?.swell1, swellPeriod: w?.swell1Period, swellDir: w?.swell1Dir });
    }
    const sport = sportOf(spot, s);
    if (!hasCore(sport, x)) {return 'missing core';}
    const tide = tideAt(sn.series?.tide, end ? (start + end) / 2 : start);
    return {
        sessionId: s.id, spotId: spot.id, sport, rating: s.rating, kind: s.checked ? 'checked' : 'outing', start, day: dayKey(start, s.tz), x,
        from: { snapshotId: sn.id, model, hours, limited: limited || end === null || !sn.series },
        gearIds: s.gearIds || [], tide: tide?.tide ?? null, tideMove: tide?.move ?? null,
    };
}

/** Every example at a spot */
export const examplesFor = (spot: Spot, sessions: Session[], snapshots: Snapshot[], model: string): Example[] =>
    sessions.filter(s => s.spotId === spot.id).map(s => exampleOf(spot, s, snapshots, model)).filter((e): e is Example => typeof e !== 'string');

/** A session's tide, from the tides saved with its forecast (the middle of the outing) */
export function sessionTide(s: Session, snapshots: Snapshot[]): { tide: string | null; tideMove: string | null } {
    const sn = s.snapshotId ? snapshotById(snapshots, s.snapshotId) : null;
    const { start, end } = outingTimes(s);
    const t = tideAt(sn?.series?.tide, end ? (start + end) / 2 : start);
    return { tide: t?.tide ?? null, tideMove: t?.move ?? null };
}
