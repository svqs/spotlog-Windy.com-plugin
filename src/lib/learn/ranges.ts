/**
 * Ranges: your own ones (set with Adjust, and your wind window) as a starting preference, and the
 * descriptive "What works here" ranges: where your well-rated outings' forecasts were.
 */
import { DIRS } from '../wind';
import { PRIOR, RANGES, SCALE, TOLERANCE } from './config';
import { allFeatures, diff, featuresOf, has, isCircular, type Feature, type Features } from './features';
import type { Dir8, Spot } from '../types';
import type { Example } from './examples';

/** One condition's range: spans for numbers (an open end = no limit), compass sectors for directions */
export interface Range {
    key: Feature;
    spans?: { lo?: number; hi?: number }[];
    dirs?: Dir8[];
    /** set by you (Adjust), your wind window, or seen in your outings */
    from: 'you' | 'window' | 'sessions';
}
/** A row of "What works here": the range plus how much it sets your great and poor days apart (0–1) */
export interface RangeRow extends Range { matters: number }

/** Your own ranges for a sport as a starting preference */
export interface Prior { ranges: Range[]; weight: number; confirmed: boolean }

const sectorOf = (deg: number): Dir8 => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

/** 0–1: how well a value fits a range (1 inside, falling to 0 a tolerance beyond it) */
export function fitRange(r: Range, v: number): number {
    if (r.dirs) {
        const excess = Math.min(...r.dirs.map(d => diff(r.key, DIRS.indexOf(d) * 45, v))) - 22.5;
        return excess <= 0 ? 1 : Math.max(0, 1 - excess / TOLERANCE[r.key]);
    }
    return Math.max(0, ...(r.spans || []).map(({ lo = -Infinity, hi = Infinity }) => {
        if (v >= lo && v <= hi) {return 1;}
        const edge = v < lo ? lo : hi;
        return 1 - Math.abs(v - edge) / Math.max(0.25 * Math.abs(edge), TOLERANCE[r.key]);
    }));
}

/**
 * Your ranges for a sport: the ones you set with Adjust win; your wind window covers wind and direction.
 * Confirmed (set by you, or a window you confirmed) counts more than a preset window; "I don't know yet" gives none.
 */
export function priorOf(spot: Spot, sport: string): Prior {
    const own = spot.ranges?.[sport] || {};
    const ranges: Range[] = [];
    for (const key of allFeatures(sport)) {
        const o = own[key];
        // (gust ranges from 0.14.0 were a gust factor, 1–2: skipped)
        const oldFactor = key === 'gust' && (o?.lo ?? 0) < 3 && (o?.hi ?? 0) < 3;
        if (o?.dirs?.length) {ranges.push({ key, dirs: o.dirs, from: 'you' });}
        else if (o && !oldFactor && (typeof o.lo === 'number' || typeof o.hi === 'number')) {ranges.push({ key, spans: [{ lo: o.lo, hi: o.hi }], from: 'you' });}
        else if (!spot.windUnknown && key === 'wind') {ranges.push({ key, spans: [{ lo: spot.min, hi: spot.max }], from: 'window' });}
        else if (!spot.windUnknown && key === 'dir' && spot.dirs.length) {ranges.push({ key, dirs: spot.dirs, from: 'window' });}
    }
    const confirmed = ranges.some(r => r.from === 'you') || !!spot.windowConfirmed;
    return { ranges, confirmed, weight: !ranges.length ? 0 : confirmed ? PRIOR.confirmedWeight : PRIOR.presetWeight };
}

/** 0–1: how well a forecast fits your ranges (the worst one decides); null when none applies */
export function userFit(p: Prior, x: Features): number | null {
    const fits = p.ranges.filter(r => has(x, r.key)).map(r => fitRange(r, x[r.key] as number));
    return fits.length ? Math.min(...fits) : null;
}

/* ---------- "What works here": descriptive ranges from your outings ---------- */

/** Weighted percentile of sorted values */
function percentile(v: { x: number; w: number }[], q: number): number {
    const total = v.reduce((a, p) => a + p.w, 0);
    let acc = 0;
    for (const p of v) {
        acc += p.w;
        if (acc >= q * total) {return p.x;}
    }
    return v[v.length - 1].x;
}

/**
 * Where well-rated outings were, as one or more spans: a gap wider than the feature's scale with a poor outing
 * inside splits them (so a strongly unsuccessful middle isn't called "works"). Each span is the weighted 10–90 %.
 */
function spansOf(key: Feature, good: { x: number; w: number }[], poor: number[]): { lo: number; hi: number }[] {
    const sorted = [...good].sort((a, b) => a.x - b.x);
    const groups: (typeof sorted)[] = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i++) {
        const [a, b] = [sorted[i - 1].x, sorted[i].x];
        if (b - a > SCALE[key] && poor.some(p => p > a && p < b)) {groups.push([]);}
        groups[groups.length - 1].push(sorted[i]);
    }
    return groups.map(g => (g.length >= RANGES.minGood ? { lo: percentile(g, RANGES.low), hi: percentile(g, RANGES.high) } : { lo: g[0].x, hi: g[g.length - 1].x }));
}

/** How much a range sets great and poor outings apart: starts at "some" (core) / "a little" (extras), poor outings move it */
function mattersOf(r: Range, core: boolean, list: Example[]): number {
    const known = list.filter(e => has(e.x, r.key));
    const inside = (e: Example) => fitRange(r, e.x[r.key] as number) >= 0.99;
    const good = known.filter(e => e.rating >= RANGES.goodFrom);
    const poor = known.filter(e => e.rating <= RANGES.poorTo);
    const share = (l: Example[], want: boolean, none: number) => (l.length ? l.filter(e => inside(e) === want).length / l.length : none);
    const apart = Math.max(0, share(good, true, 1) + share(poor, false, 0) - 1);
    const base = core ? 0.5 : 0.25;
    return Math.max(0.05, (2 * base + poor.length * apart) / (2 + poor.length));
}

/** The rows of "What works here" for one sport: your ranges first, then your outings, then your wind window */
export function describe(sport: string, prior: Prior, local: Example[]): RangeRow[] {
    const outings = local.filter(e => e.kind === 'outing');
    const perDay = new Map<string, number>();
    outings.forEach(e => perDay.set(e.day, (perDay.get(e.day) || 0) + 1));
    const { core } = featuresOf(sport);
    const rows: RangeRow[] = [];
    for (const key of allFeatures(sport)) {
        const mine = prior.ranges.find(p => p.key === key && p.from === 'you');
        const good = outings.filter(e => e.rating >= RANGES.goodFrom && has(e.x, key));
        let r: Range | undefined = mine;
        if (!r && good.length >= RANGES.minGood) {
            const vals = good.map(e => ({ x: e.x[key] as number, w: 1 / (perDay.get(e.day) || 1) }));
            r = isCircular(key)
                ? { key, from: 'sessions', dirs: DIRS.filter(d => vals.some(v => sectorOf(v.x) === d)) }
                : { key, from: 'sessions', spans: spansOf(key, vals, local.filter(e => e.rating <= RANGES.poorTo && has(e.x, key)).map(e => e.x[key] as number)) };
        }
        r = r || prior.ranges.find(pr => pr.key === key);
        if (r) {rows.push({ ...r, matters: mattersOf(r, core.includes(key), local) });}
    }
    return rows;
}

/** "matters a lot" (3), "some" (2), "a little" (1) */
export const mattersLevel = (x: number): number => (x >= 0.65 ? 3 : x >= 0.35 ? 2 : 1);
