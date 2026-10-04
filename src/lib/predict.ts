/*
 * spotlog's recommendation (v2): the public face of src/lib/learn/.
 * ------------------------------------------------------------------
 * 1. examples.ts  every outing becomes one example: the forecast saved BEFORE it started, summed up over the
 *                 outing, plus its 1–5 rating. Nothing else teaches.
 * 2. similar.ts   a forecast is rated from the most similar past outings (closer = more weight), blended with
 *                 your own ranges as a starting preference; a tag needs enough local evidence.
 * 3. trees.ts     with lots of varied outings, boosted trees may join in, but only after beating similar
 *                 sessions on later outings (walk-forward check).
 * 4. windows.ts   when to go: hourly windows over the coming forecast, merged into stretches, never across gaps.
 * 5. ranges.ts    "What works here": your ranges, and where your well-rated outings' forecasts were.
 * All numbers live in learn/config.ts. docs/learning.md explains the method.
 */
import { DIRS } from './directions';
import { distanceKm } from './geo';
import { ALGORITHM_VERSION, SIMILAR, TRUST } from './learn/config';
import { examplesFor, sportOf, type Example } from './learn/examples';
import { priorOf, type Range } from './learn/ranges';
import { sportModel, type SportModel } from './learn/model';
import { modelSkill, type ModelSkill } from './learn/skill';
import { trainTreesAsync, treesEligible, type TreeModel } from './learn/trees';
import type { Conditions } from './learn/features';
import type { Dir8, Session, Snapshot, Spot, ModelValue, WaveValue } from './types';

export { allFeatures, featuresOf, isCircular, toFeatures, type Conditions, type Feature, type Features, type Hour } from './learn/features';
export { fitRange, mattersLevel, type Range, type RangeRow } from './learn/ranges';
export { rate, rateBest, type Result, type SportModel } from './learn/model';
export { bestIn, bestToday, nextDays, type DayBest } from './learn/windows';
export { bestTide, tideAt, type TideHint } from './learn/tide';
export { exampleOf, examplesFor, outingTimes, sessionTide, type Example } from './learn/examples';
export { modelSkill, type ModelSkill };

/** The spot's base model: ECMWF, or the one fallback chosen once where ECMWF has no forecast */
export const recommendationModel = (spot: Spot): string => spot.recommendationModel || 'ecmwf';

/**
 * The model a spot learns and recommends from: its base model, until another one has foretold your sessions
 * there clearly better on enough of them ("Which forecast to trust here"); then that one.
 */
export function learningModel(spot: Spot, sessions: Session[], snapshots: Snapshot[], skill: ModelSkill[] = modelSkill(spot, sessions, snapshots)): string {
    const base = recommendationModel(spot);
    const best = skill[0];
    const current = skill.find(m => m.model === base);
    const better = best && best.model !== base && best.count >= TRUST.switchAfter && (!current || best.miss <= current.miss - TRUST.switchMargin);
    return better ? best.model : base;
}

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
export function treeKey(m: SportModel): string {
    const examples = (items: Example[]) => [...items].sort((a, b) => a.sessionId.localeCompare(b.sessionId)).map(item => ({
        id: item.sessionId, rating: item.rating, kind: item.kind, day: item.day, start: item.start,
        x: item.x, from: item.from,
    }));
    // Exact canonical inputs avoid short-hash collisions and include changed forecast provenance/features.
    return JSON.stringify([ALGORITHM_VERSION, m.spotId, m.sport, m.prior, examples(m.local), examples(m.nearby)]);
}
const pendingTrees = new Map<string, Promise<boolean>>();
let activeTreeKeys = new Set<string>();
let trainingQueue: Promise<unknown> = Promise.resolve();

/** Everything spotlog knows about a spot: one model per sport (examples here + outings at spots next door) */
export function learnSpot(spot: Spot, spots: Spot[], sessions: Session[], snapshots: Snapshot[], model = learningModel(spot, sessions, snapshots), readExamples = examplesFor): SportModel[] {
    const local = readExamples(spot, sessions, snapshots, model);
    const near = nearbySpots(spot, spots).flatMap(o => readExamples(o, sessions, snapshots, model)).filter(e => e.kind === 'outing');
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
    activeTreeKeys = new Set(models.map(treeKey));
    for (const key of treeCache.keys()) {if (!activeTreeKeys.has(key)) {treeCache.delete(key);}}
    const results = await Promise.all(models.map(m => {
        const key = treeKey(m);
        if (treeCache.has(key) || !treesEligible(m.local)) {return Promise.resolve(false);}
        const pending = pendingTrees.get(key);
        if (pending) {return pending;}
        const task = trainingQueue.then(async () => {
            if (!activeTreeKeys.has(key)) {pendingTrees.delete(key); return false;}
            try {
                const trained = await trainTreesAsync(m.sport, m.local, m.nearby, m.prior, () => activeTreeKeys.has(key));
                if (!activeTreeKeys.has(key)) {return false;}
                treeCache.set(key, trained);
                return !!trained;
            } catch (error) {
                if (activeTreeKeys.has(key)) {treeCache.set(key, null);}
                console.info('[spotlog] trees not trained', error);
                return false;
            } finally {pendingTrees.delete(key);}
        });
        trainingQueue = task;
        pendingTrees.set(key, task);
        return task;
    }));
    return results.some(Boolean);
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
