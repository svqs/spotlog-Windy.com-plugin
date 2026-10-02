import { DIRS, dirMatches } from './wind';
import type { Dir8, Session, Snapshot, Spot, ModelValue, WaveValue } from './types';

/*
 * How spotlog guesses a rating
 * ----------------------------
 * 1. Your wind window (directions + strength you entered for the spot) is the starting guess:
 *    inside it counts like one "good" session, outside it says nothing (no negative guess).
 * 2. Every logged session at the spot that has a saved forecast is a sample: wind, gusts, direction
 *    and waves of that forecast at the session time, plus your rating.
 * 3. Samples close to the conditions asked about count most. "Close" is relative: 2 m/s more matters
 *    a lot at 6 m/s and little at 20 m/s, so a step is 25 % of the wind (and 50 % of the wave height).
 * 4. Only good guesses are shown (good, great, epic); anything below is "Not sure yet".
 */

const angDiff = (a: number, b: number): number => Math.abs((((a - b) % 360) + 540) % 360 - 180);

export interface Conditions {
    wind: number | null;
    gust: number | null;
    dir: number | null;
    waves: number | null;
}

export const conditionsOf = (m: ModelValue | null | undefined, wv?: WaveValue | null): Conditions | null =>
    m ? { wind: m.wind, gust: m.gust, dir: m.dir, waves: wv?.waves ?? null } : null;

export interface Sample extends Conditions {
    wind: number;
    dir: number;
    rating: number;
    tide: string | null;
    tideMove: string | null;
}

/** When the session happened: its day plus the middle of start–end (or the start), else the day itself */
export const sessionTime = (s: Session): number => {
    const day = new Date(s.date);
    const at = (hm: string) => { const [h, m] = hm.split(':').map(Number); const d = new Date(day); d.setHours(h, m, 0, 0); return d.getTime(); };
    if (/^\d\d:\d\d$/.test(s.start)) {
        const a = at(s.start);
        if (/^\d\d:\d\d$/.test(s.end)) {
            let b = at(s.end);
            if (b < a) {b += 864e5;}
            return a + (b - a) / 2;
        }
        return a;
    }
    return s.date;
};

const nearest = (list: number[], ts: number): number => {
    let best = 0;
    for (let i = 1; i < list.length; i++) {if (Math.abs(list[i] - ts) < Math.abs(list[best] - ts)) {best = i;}}
    return best;
};

/** The forecast of a snapshot at the time of the session (the saved day if it covers it, else the saved moment) */
const forecastFor = (sn: Snapshot, ts: number): Conditions | null => {
    const sr = sn.series;
    if (sr && sr.ts.length && ts >= sr.ts[0] - 3600e3 && ts <= sr.ts[sr.ts.length - 1] + 3600e3) {
        const i = nearest(sr.ts, ts);
        const m = sr.models[sn.primary] || Object.values(sr.models)[0];
        if (m && m.wind[i] != null && m.dir[i] != null) {
            return { wind: m.wind[i], gust: m.gust[i] ?? null, dir: m.dir[i], waves: sr.waves?.waves[i] ?? null };
        }
    }
    const p = sn.models.find(m => m.model === sn.primary) || sn.models[0];
    return p ? conditionsOf(p, sn.waves) : null;
};

/** Sessions at a spot that have a forecast attached (the forecast is what we can compare against) */
export const samplesFor = (spot: Spot, sessions: Session[], snapshots: Snapshot[]): Sample[] =>
    sessions
        .filter(s => s.spotId === spot.id && s.snapshotId)
        .map(s => {
            const sn = snapshots.find(x => x.id === s.snapshotId);
            const c = sn ? forecastFor(sn, sessionTime(s)) : null;
            return c && c.wind !== null && c.dir !== null
                ? { ...c, wind: c.wind, dir: c.dir, rating: s.rating, tide: s.tide ?? null, tideMove: s.tideMove ?? null }
                : null;
        })
        .filter((x): x is Sample => !!x);

export const MIN_SAMPLES = 3;
/** a sample counts as "similar" from this weight on (about 1.5 steps away) */
const SIMILAR = 0.3;
/** the wind window as a starting guess: like one session rated a bit better than good */
const PRIOR_RATING = 3.4;
const PRIOR_WEIGHT = 1;

/** steps between two values, relative to their size: |ln(a/b)| / ln(1 + step) */
const rel = (a: number, b: number, offset: number, step: number) => Math.abs(Math.log((a + offset) / (b + offset))) / Math.log(1 + step);

/** How far apart two conditions are, in "steps" (0 = the same day again) */
export const distance = (a: Conditions, b: Conditions): number => {
    if (a.wind === null || b.wind === null || a.dir === null || b.dir === null) {return Infinity;}
    let d2 = rel(a.wind, b.wind, 1, 0.25) ** 2 + (angDiff(a.dir, b.dir) / 40) ** 2;
    // gustiness: gusts relative to the wind (1.2 = steady, 1.6 = gusty)
    if (a.gust !== null && b.gust !== null) {
        const ga = a.gust / Math.max(a.wind, 2);
        const gb = b.gust / Math.max(b.wind, 2);
        d2 += ((ga - gb) / 0.3 * 0.7) ** 2;
    }
    if (a.waves !== null && b.waves !== null) {d2 += (rel(a.waves, b.waves, 0.3, 0.5) * 0.8) ** 2;}
    return Math.sqrt(d2);
};

/** Is it inside the wind window the user entered (with a little slack at the ends)? */
export const inWindow = (spot: Spot, c: Conditions): boolean =>
    !spot.windUnknown && spot.dirs.length > 0 && c.wind !== null && c.dir !== null &&
    c.wind >= spot.min * 0.9 && c.wind <= spot.max * 1.1 && dirMatches(c.dir, spot.dirs);

export interface Guess {
    /** 1–5, or null = not sure yet */
    rating: number | null;
    /** how many of your sessions were in similar conditions */
    similar: number;
    /** the wind window took part in the guess */
    fromWindow: boolean;
    /** sessions with a forecast at this spot */
    samples: number;
}

/** Guess how a session would be rated in these conditions, from the wind window and your sessions here */
export const guess = (spot: Spot, c: Conditions | null, samples: Sample[]): Guess | null => {
    if (!c || c.wind === null || c.dir === null) {return null;}
    let wSum = 0;
    let rSum = 0;
    let similar = 0;
    for (const s of samples) {
        const d = distance(s, c);
        const w = Math.exp(-(d * d) / 2);
        wSum += w;
        rSum += w * s.rating;
        if (w >= SIMILAR) {similar++;}
    }
    const fromWindow = inWindow(spot, c);
    const prior = fromWindow ? PRIOR_WEIGHT : 0;
    // nothing close in your history and outside the window: no guess (rather than a negative one)
    if (wSum + prior < 0.6) {return { rating: null, similar, fromWindow, samples: samples.length };}
    return { rating: (rSum + prior * PRIOR_RATING) / (wSum + prior), similar, fromWindow, samples: samples.length };
};

/** Old entry point: the guess as a number (null = not sure yet) */
export const predictRating = (spot: Spot, now: ModelValue | null, sessions: Session[], snapshots: Snapshot[], waves?: WaveValue | null): number | null =>
    guess(spot, conditionsOf(now, waves), samplesFor(spot, sessions, snapshots))?.rating ?? null;

/** Only good news is shown: 3 good, 4 great, 5 epic; 0 = not sure yet */
export const shownLevel = (r: number | null): number => (r === null ? 0 : r >= 4.2 ? 5 : r >= 3.5 ? 4 : r >= 2.7 ? 3 : 0);

/* ---------- the best window of the day ---------- */

export interface Hour extends Conditions { ts: number; day: boolean }

export interface DayBest {
    start: number;
    end: number;
    rating: number;
    level: number;
    similar: number;
    fromWindow: boolean;
    /** the window is going on right now */
    now: boolean;
}

/**
 * The best stretch of the rest of today: consecutive daylight hours that look good or better,
 * the one with the best guess wins (the earlier one on a tie).
 */
export const bestToday = (spot: Spot, hours: Hour[], samples: Sample[], now = Date.now()): DayBest | null => {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const step = hours.length > 1 ? Math.min(...hours.slice(1).map((h, i) => h.ts - hours[i].ts)) : 3600e3;
    const list = hours.filter(h => h.ts + step / 2 > now && h.ts <= end.getTime());
    let best: DayBest | null = null;
    let run: { h: Hour; g: Guess }[] = [];
    const close = () => {
        if (!run.length) {return;}
        const r = run.reduce((a, x) => a + (x.g.rating as number), 0) / run.length;
        const cand: DayBest = {
            start: run[0].h.ts, end: run[run.length - 1].h.ts + step, rating: r, level: shownLevel(r),
            similar: Math.max(...run.map(x => x.g.similar)), fromWindow: run.some(x => x.g.fromWindow),
            now: run[0].h.ts - step / 2 <= now,
        };
        if (cand.level && (!best || cand.rating > best.rating + 0.05)) {best = cand;}
        run = [];
    };
    for (const h of list) {
        const g = h.day ? guess(spot, h, samples) : null;
        if (g && shownLevel(g.rating) >= 3) {run.push({ h, g });} else {close();}
    }
    close();
    return best;
};

/* ---------- the wind window learns from your sessions ---------- */

const dirOf = (deg: number): Dir8 => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
const r1 = (x: number) => Math.round(x * 2) / 2;

export interface WindowChange {
    dirs: Dir8[];
    min: number;
    max: number;
    /** sessions it is based on */
    basedOn: number;
}

/**
 * After a few sessions, the wind window follows what really worked:
 * - a direction with 2+ sessions rated great or epic is added; one with 3+ sessions and none even good is taken out
 * - the strength widens to include the great sessions, and narrows when 3+ poor sessions sit between the edge and the great ones
 * Returns null when nothing should change (or there is too little to go on).
 */
export const learnWindow = (spot: Spot, samples: Sample[]): WindowChange | null => {
    if (spot.windUnknown || !spot.dirs.length || samples.length < 4) {return null;}
    const good = samples.filter(s => s.rating >= 4);
    const poor = samples.filter(s => s.rating <= 2);
    if (good.length < 2) {return null;}
    const dirs = new Set<Dir8>(spot.dirs);
    for (const d of DIRS) {
        const here = samples.filter(s => dirOf(s.dir) === d);
        const g = here.filter(s => s.rating >= 4).length;
        if (g >= 2) {dirs.add(d);}
        if (here.length >= 3 && !here.some(s => s.rating >= 3) && dirs.size > 1) {dirs.delete(d);}
    }
    let min = spot.min;
    let max = spot.max;
    const gw = good.map(s => s.wind);
    const lowGood = Math.min(...gw);
    const highGood = Math.max(...gw);
    if (good.filter(s => s.wind < min * 0.9).length >= 2) {min = Math.max(0, r1(lowGood - 0.5));}
    if (good.filter(s => s.wind > max * 1.1).length >= 2) {max = r1(highGood + 0.5);}
    const weakLow = poor.filter(s => s.wind >= min && s.wind < lowGood);
    if (weakLow.length >= 3) {min = Math.min(r1(Math.max(...weakLow.map(s => s.wind)) + 0.5), lowGood);}
    const weakHigh = poor.filter(s => s.wind <= max && s.wind > highGood);
    if (weakHigh.length >= 3) {max = Math.max(r1(Math.min(...weakHigh.map(s => s.wind)) - 0.5), highGood);}
    const list = DIRS.filter(d => dirs.has(d));
    const same = list.length === spot.dirs.length && list.every(d => spot.dirs.includes(d)) && Math.abs(min - spot.min) < 0.5 && Math.abs(max - spot.max) < 0.5;
    return same || min >= max ? null : { dirs: list, min, max, basedOn: samples.length };
};

export interface WindSuggestion {
    dirs: Dir8[];
    min: number;
    max: number;
    basedOn: number;
}

/** "I don't know yet" spots: learn the wind window from sessions rated great or epic */
export const suggestWindow = (spot: Spot, sessions: Session[], snapshots: Snapshot[]): WindSuggestion | null => {
    const good = samplesFor(spot, sessions, snapshots).filter(s => s.rating >= 4);
    if (good.length < 2) {return null;}
    const dirs = Array.from(new Set(good.map(s => dirOf(s.dir))));
    const winds = good.map(s => s.wind);
    return {
        dirs: DIRS.filter(d => dirs.includes(d)),
        min: Math.max(0, Math.floor(Math.min(...winds) - 1)),
        max: Math.ceil(Math.max(...winds) + 1),
        basedOn: good.length,
    };
};

/* ---------- tide: spotlog can't forecast it, but you know it; your best sessions show which tide works ---------- */

export interface TideHint { tide: string | null; move: string | null; of: number; total: number }

/** The tide most of your great sessions here had (needs 2+ great sessions with a tide logged) */
export const bestTide = (samples: { rating: number; tide?: string | null; tideMove?: string | null }[]): TideHint | null => {
    const good = samples.filter(s => s.rating >= 4 && (s.tide || s.tideMove));
    if (good.length < 2) {return null;}
    const top = (k: 'tide' | 'tideMove') => {
        const n = new Map<string, number>();
        good.forEach(s => { const x = s[k]; if (x) {n.set(x, (n.get(x) || 0) + 1);} });
        const [v, c] = [...n.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0];
        return c >= Math.max(2, Math.ceil(good.length / 2)) ? { v, c } : null;
    };
    const t = top('tide');
    const m = top('tideMove');
    if (!t && !m) {return null;}
    return { tide: t?.v ?? null, move: m?.v ?? null, of: Math.min(t?.c ?? Infinity, m?.c ?? Infinity), total: good.length };
};
