/*
 * spotlog's recommendation (v2): the public face of src/lib/learn/.
 * ------------------------------------------------------------------
 * 1. examples.ts  every outing becomes one example: the forecast saved BEFORE it started, summed up over the
 *                 outing, plus its 1–5 rating. Nothing else teaches.
 * 2. similar.ts   a forecast is rated from the most similar past outings (closer = more weight), blended with
 *                 your own ranges as a starting preference; a tag needs enough local evidence.
 * 3. trees.ts     with lots of varied outings, boosted trees may join in, but only after beating similar
 *                 sessions on later outings (walk-forward check).
 * 4. windows.ts   when to go: two-hour windows over the coming forecast, merged into stretches, never across gaps.
 * 5. ranges.ts    "What works here": your ranges, and where your well-rated outings' forecasts were.
 * All numbers live in learn/config.ts. docs/learning.md explains the method.
 */
import { DIRS, distanceKm } from './wind';
import { ALGORITHM_VERSION, SIMILAR } from './learn/config';
import { examplesFor, sportOf, type Example } from './learn/examples';
import { priorOf, type Range } from './learn/ranges';
import { sportModel, type SportModel } from './learn/model';
import { trainTrees, treesEligible, type TreeModel } from './learn/trees';
import type { Conditions } from './learn/features';
import type { Dir8, Session, Snapshot, Spot, ModelValue, WaveValue } from './types';

export { allFeatures, featuresOf, isCircular, toFeatures, type Conditions, type Feature, type Features, type Hour } from './learn/features';
export { fitRange, mattersLevel, type Range, type RangeRow } from './learn/ranges';
export { rate, rateBest, type Result, type SportModel } from './learn/model';
export { bestIn, bestToday, nextDays, type DayBest } from './learn/windows';
export { bestTide, tideAt, type TideHint } from './learn/tide';
export { exampleOf, examplesFor, outingTimes, sessionTide, type Example } from './learn/examples';

/** The model a spot learns and recommends from: ECMWF, or the one fallback chosen once where ECMWF has no forecast */
export const recommendationModel = (spot: Spot): string => spot.recommendationModel || 'ecmwf';

export const conditionsOf = (m: ModelValue | null | undefined, wv?: WaveValue | null): Conditions | null =>
    m ? {
        wind: m.wind, gust: m.gust, dir: m.dir, temp: m.temp, rain: m.rain ?? null,
        waves: wv?.waves ?? null, period: wv?.wavesPeriod ?? null, wavesDir: wv?.wavesDir ?? null, power: wv?.wavesPower ?? null,
        swell: wv?.swell1 ?? null, swellPeriod: wv?.swell1Period ?? null, swellDir: wv?.swell1Dir ?? null,
    } : null;

/** Spots next door (within 3 km) */
export const nearbySpots = (spot: Spot, spots: Spot[], km = SIMILAR.nearbyKm): Spot[] => spots.filter(o => o.id !== spot.id && distanceKm(spot, o) <= km);

/* ---------- learning a spot ---------- */

/** Boosted trees already trained (or found not to help), per spot, sport and the data they saw */
const treeCache = new Map<string, TreeModel | null>();
const treeKey = (m: SportModel): string => {
    const s = [ALGORITHM_VERSION, m.spotId, m.sport, JSON.stringify(m.prior), ...[...m.local, ...m.nearby].map(e => `${e.sessionId}:${e.rating}:${e.start}`)].join('|');
    let h = 5381;
    for (let i = 0; i < s.length; i++) {h = ((h << 5) + h + s.charCodeAt(i)) | 0;}
    return `${m.spotId}|${m.sport}|${h}`;
};

/** Everything spotlog knows about a spot: one model per sport (examples here + outings at spots next door) */
export function learnSpot(spot: Spot, spots: Spot[], sessions: Session[], snapshots: Snapshot[]): SportModel[] {
    const model = recommendationModel(spot);
    const local = examplesFor(spot, sessions, snapshots, model);
    const near = nearbySpots(spot, spots).flatMap(o => examplesFor(o, sessions, snapshots, model)).filter(e => e.kind === 'outing');
    return (spot.sports.length ? spot.sports : ['Other']).map(sport => {
        const m = sportModel(spot.id, sport, local.filter(e => e.sport === sport), near.filter(e => e.sport === sport), priorOf(spot, sport));
        m.trees = treeCache.get(treeKey(m)) ?? null;
        return m;
    });
}

/**
 * Trains the boosted trees that are due, one at a time between frames so the screen never waits.
 * Resolves true when a model changed (then learn the spots again to pick them up).
 */
export async function trainTreesInBackground(models: SportModel[]): Promise<boolean> {
    let changed = false;
    for (const m of models) {
        const key = treeKey(m);
        if (treeCache.has(key) || !treesEligible(m.local)) {continue;}
        await new Promise(r => setTimeout(r, 0));
        try {
            const t = trainTrees(m.sport, m.local, m.nearby, m.prior);
            treeCache.set(key, t);
            changed = changed || !!t;
        } catch (e) {
            // a failed training leaves similar sessions in charge
            console.info('[spotlog] trees not trained', e);
            treeCache.set(key, null);
        }
    }
    return changed;
}

/* ---------- wind window helpers (spot page) ---------- */

const sectorOf = (deg: number): Dir8 => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
const goodOutings = (local: Example[]) => local.filter(e => e.kind === 'outing' && e.rating >= 4 && e.x.wind != null && e.x.dir != null);

export interface WindSuggestion { dirs: Dir8[]; min: number; max: number; basedOn: number }

/** "I don't know yet" spots: the forecast wind of your great outings (from 2) */
export function suggestWindow(models: SportModel[]): WindSuggestion | null {
    const good = goodOutings(models.flatMap(m => m.local));
    if (good.length < 2) {return null;}
    const winds = good.map(e => e.x.wind as number);
    const dirs = new Set(good.map(e => sectorOf(e.x.dir as number)));
    return { dirs: DIRS.filter(d => dirs.has(d)), min: Math.max(0, Math.floor(Math.min(...winds) - 1)), max: Math.ceil(Math.max(...winds) + 1), basedOn: good.length };
}

/** The wind and directions your outings show for the first sport, when they differ from your window: "Use this" */
export function learnedWindow(spot: Spot, m: SportModel | undefined): WindSuggestion | null {
    const row = (k: string) => m?.rows.find(r => r.key === k && r.from === 'sessions') as Range | undefined;
    const w = row('wind');
    const d = row('dir');
    if (!m || (!w && !d)) {return null;}
    const lo = Math.min(...(w?.spans || []).map(s => s.lo ?? spot.min));
    const hi = Math.max(...(w?.spans || []).map(s => s.hi ?? spot.max));
    const out = { dirs: d?.dirs || spot.dirs, min: w ? Math.round(lo * 2) / 2 : spot.min, max: w ? Math.round(hi * 2) / 2 : spot.max, basedOn: m.outings };
    const same = out.dirs.length === spot.dirs.length && out.dirs.every(x => spot.dirs.includes(x)) && Math.abs(out.min - spot.min) < 0.5 && Math.abs(out.max - spot.max) < 0.5;
    return same ? null : out;
}

/* ---------- gear: after many outings with one piece of gear here, the forecast wind it was great in ---------- */

export const GEAR_MIN_SESSIONS = 8;
export interface GearHint { gearId: string; lo: number; hi: number; sessions: number }

export function gearHints(models: SportModel[]): GearHint[] {
    const outings = models.flatMap(m => m.local).filter(e => e.kind === 'outing');
    return [...new Set(outings.flatMap(e => e.gearIds))].flatMap(id => {
        const used = outings.filter(e => e.gearIds.includes(id));
        const great = used.filter(e => e.rating >= 4 && e.x.wind != null).map(e => e.x.wind as number);
        return used.length >= GEAR_MIN_SESSIONS && great.length >= 3 ? [{ gearId: id, lo: Math.min(...great), hi: Math.max(...great), sessions: used.length }] : [];
    });
}

/** The sport a session counts for at its spot */
export { sportOf };
