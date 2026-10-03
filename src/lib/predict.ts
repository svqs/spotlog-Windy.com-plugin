import { DIRS } from './wind';
import type { Dir8, Session, Snapshot, Spot, ModelValue, WaveValue } from './types';

/*
 * How spotlog learns what works at a spot
 * ---------------------------------------
 * 1. Every sport has its own conditions that matter (windsurf: wind, direction, gusts, waves;
 *    surf: swell, period, swell direction, wind, direction; …).
 * 2. Per spot and sport, each condition gets an ideal range: from your wind window at first,
 *    then from the forecasts of your great sessions (ECMWF at the session time).
 * 3. Each condition also learns how much it matters here: if your poor sessions were outside the
 *    range and your great ones inside, it matters a lot; if poor sessions were inside too, it matters little.
 * 4. The guess = how well the conditions fit the ranges (important ones count more; one that matters and is
 *    clearly off pulls the day down), times how good your sessions in fitting conditions were.
 *    Only good, great and epic are shown.
 */

export type ParamKey = 'wind' | 'gust' | 'dir' | 'waves' | 'swell' | 'period' | 'swellDir';

export interface Conditions {
    wind: number | null;
    gust: number | null;
    dir: number | null;
    waves: number | null;
    period?: number | null;
    wavesDir?: number | null;
    swell?: number | null;
    swellPeriod?: number | null;
    swellDir?: number | null;
}

/** The conditions that matter per sport, most important first (before anything is learned they all count the same) */
export const SPORT_PARAMS: Record<string, ParamKey[]> = {
    Windsurf: ['wind', 'dir', 'gust', 'waves'],
    Kite: ['wind', 'dir', 'gust', 'waves'],
    Wing: ['wind', 'dir', 'gust', 'waves'],
    Surf: ['swell', 'period', 'swellDir', 'wind', 'dir'],
    SUP: ['wind', 'dir', 'waves'],
    Other: ['wind', 'dir', 'waves'],
};
const CIRCULAR: ParamKey[] = ['dir', 'swellDir'];
export const paramsOf = (sport: string): ParamKey[] => SPORT_PARAMS[sport] || SPORT_PARAMS.Other;
export const sportsOf = (spot: Spot): string[] => (spot.sports.length ? spot.sports : ['Other']);

/** The value of one condition (gusts as a gust factor: gusts ÷ wind; surf uses swell when the forecast has it) */
export const valueOf = (c: Conditions, k: ParamKey): number | null => {
    switch (k) {
        case 'wind': return c.wind;
        case 'gust': return c.gust !== null && c.wind !== null ? c.gust / Math.max(c.wind, 2) : null;
        case 'dir': return c.dir;
        case 'waves': return c.waves;
        case 'swell': return c.swell ?? c.waves;
        case 'period': return c.swellPeriod ?? c.period ?? null;
        case 'swellDir': return c.swellDir ?? c.wavesDir ?? null;
    }
};

export const conditionsOf = (m: ModelValue | null | undefined, wv?: WaveValue | null): Conditions | null =>
    m ? {
        wind: m.wind, gust: m.gust, dir: m.dir, waves: wv?.waves ?? null, period: wv?.wavesPeriod ?? null, wavesDir: wv?.wavesDir ?? null,
        swell: wv?.swell1 ?? null, swellPeriod: wv?.swell1Period ?? null, swellDir: wv?.swell1Dir ?? null,
    } : null;

export interface Sample extends Conditions {
    rating: number;
    sport: string;
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

/**
 * The forecast of a snapshot at the time of the session. ECMWF when it was saved (today's guesses use ECMWF too,
 * so like is compared with like), else the model that was on the map.
 */
const forecastFor = (sn: Snapshot, ts: number): Conditions | null => {
    const sr = sn.series;
    if (sr && sr.ts.length && ts >= sr.ts[0] - 3600e3 && ts <= sr.ts[sr.ts.length - 1] + 3600e3) {
        const i = nearest(sr.ts, ts);
        const m = sr.models.ecmwf || sr.models[sn.primary] || Object.values(sr.models)[0];
        const w = sr.waves;
        if (m && m.wind[i] != null && m.dir[i] != null) {
            return {
                wind: m.wind[i], gust: m.gust[i] ?? null, dir: m.dir[i], waves: w?.waves[i] ?? null, period: w?.wavesPeriod[i] ?? null,
                wavesDir: w?.wavesDir[i] ?? null, swell: w?.swell1[i] ?? null, swellPeriod: w?.swell1Period[i] ?? null, swellDir: w?.swell1Dir[i] ?? null,
            };
        }
    }
    const p = sn.models.find(m => m.model === 'ecmwf') || sn.models.find(m => m.model === sn.primary) || sn.models[0];
    return p ? conditionsOf(p, sn.waves) : null;
};

/** Sessions at a spot that have a forecast attached (the forecast is what we can compare against) */
export const samplesFor = (spot: Spot, sessions: Session[], snapshots: Snapshot[]): Sample[] =>
    sessions
        .filter(s => s.spotId === spot.id && s.snapshotId)
        .map(s => {
            const sn = snapshots.find(x => x.id === s.snapshotId);
            const c = sn ? forecastFor(sn, sessionTime(s)) : null;
            const sport = s.sport && spot.sports.includes(s.sport) ? s.sport : sportsOf(spot)[0];
            return c && c.wind !== null && c.dir !== null
                ? { ...c, rating: s.rating, sport, tide: s.tide ?? null, tideMove: s.tideMove ?? null }
                : null;
        })
        .filter((x): x is Sample => !!x);

/* ---------- learning ---------- */

/** the settings of the learning, in one place (see docs/rating-logic.xlsx) */
export const LEARN = {
    /** great sessions needed before a range is learned from sessions */
    minGood: 2,
    /** from this many great sessions, the outer 10 % on each side are ignored (one odd day doesn't stretch the range) */
    trimFrom: 6,
    /** a learned range is widened by this share on each side */
    margin: 0.1,
    /** half-width around each great session's direction */
    dirHalf: 20,
    /** how fast the fit drops outside a range: 25 % beyond the edge (directions: 30°) = no fit */
    tolerance: 0.25,
    dirTolerance: 30,
    /** importance before poor sessions say otherwise, and how many poor sessions that start counts as */
    baseImportance: 0.5,
    baseWeight: 2,
    /** the rating a perfect fit means when nothing is learned yet (between good and great), and how many sessions it counts as */
    startRating: 3.4,
    startWeight: 2,
    /** a session "fits" from this score */
    fitFrom: 0.85,
};

export interface ParamModel {
    key: ParamKey;
    /** linear range (wind m/s, gust factor, m, s) */
    lo?: number;
    hi?: number;
    /** directions: centres and the half-width around each */
    centres?: number[];
    half?: number;
    /** where the range comes from */
    from: 'window' | 'sessions';
    /** 0–1: how much this condition decides a good day here */
    importance: number;
}

export interface SportModel {
    sport: string;
    params: ParamModel[];
    sessions: number;
    great: number;
    poor: number;
    /** how your sessions went when the conditions fitted (1–5; starts at 3.4) */
    fitRating: number;
}

const angDiff = (a: number, b: number): number => Math.abs((((a - b) % 360) + 540) % 360 - 180);
const pct = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

/** 0–1: how well one value fits one learned range (1 inside, falling to 0 just beyond it) */
export const fitOf = (p: ParamModel, v: number): number => {
    if (p.centres) {
        const excess = Math.min(...p.centres.map(c => angDiff(c, v))) - (p.half ?? 0);
        return excess <= 0 ? 1 : Math.max(0, 1 - excess / LEARN.dirTolerance);
    }
    const lo = p.lo ?? -Infinity;
    const hi = p.hi ?? Infinity;
    if (v >= lo && v <= hi) {return 1;}
    const d = v < lo ? (lo - v) / Math.max(Math.abs(lo), 0.5) : (v - hi) / Math.max(Math.abs(hi), 0.5);
    return Math.max(0, 1 - d / LEARN.tolerance);
};

export interface Part { key: ParamKey; value: number; fit: number; param: ParamModel }

/** 0–1: how well conditions fit what works (important conditions count more), with the part each condition plays */
export const scoreOf = (m: SportModel, c: Conditions): { score: number; parts: Part[] } | null => {
    let wSum = 0;
    let sSum = 0;
    // something that matters clearly off (no fit at all) pulls the whole day down by how much it matters
    let off = 1;
    const parts: Part[] = [];
    for (const p of m.params) {
        const v = valueOf(c, p.key);
        if (v === null) {continue;}
        const fit = fitOf(p, v);
        wSum += p.importance;
        sSum += p.importance * fit;
        if (fit === 0) {off *= 1 - p.importance;}
        parts.push({ key: p.key, value: v, fit, param: p });
    }
    return wSum > 0 ? { score: (sSum / wSum) * off, parts } : null;
};

/** The range of one condition: from your great sessions once there are enough, else from the wind window (wind, direction only) */
const rangeOf = (spot: Spot, key: ParamKey, good: Sample[]): Omit<ParamModel, 'importance'> | null => {
    const vals = good.map(s => valueOf(s, key)).filter((v): v is number => v !== null);
    if (vals.length >= LEARN.minGood) {
        if (CIRCULAR.includes(key)) {return { key, centres: vals, half: LEARN.dirHalf, from: 'sessions' };}
        const sorted = [...vals].sort((a, b) => a - b);
        const trim = sorted.length >= LEARN.trimFrom;
        const lo = trim ? pct(sorted, 0.1) : sorted[0];
        const hi = trim ? pct(sorted, 0.9) : sorted[sorted.length - 1];
        return { key, lo: lo * (1 - LEARN.margin), hi: hi * (1 + LEARN.margin), from: 'sessions' };
    }
    if (spot.windUnknown) {return null;}
    if (key === 'wind') {return { key, lo: spot.min, hi: spot.max, from: 'window' };}
    if (key === 'dir' && spot.dirs.length) {return { key, centres: spot.dirs.map(d => DIRS.indexOf(d) * 45), half: 22.5, from: 'window' };}
    return null;
};

/** What spotlog has learned about one sport at one spot */
export const learnSport = (spot: Spot, sport: string, all: Sample[]): SportModel => {
    const samples = all.filter(s => s.sport === sport);
    let good = samples.filter(s => s.rating >= 4);
    if (good.length < LEARN.minGood) {good = samples.filter(s => s.rating >= 3);}
    const poor = samples.filter(s => s.rating <= 2);
    const params: ParamModel[] = [];
    for (const key of paramsOf(sport)) {
        const r = rangeOf(spot, key, good);
        if (!r) {continue;}
        // how much it matters: great sessions inside the range and poor ones outside it = it decides the day
        const inside = (s: Sample) => { const v = valueOf(s, key); return v === null ? null : fitOf(r as ParamModel, v) >= 0.99; };
        const g = good.map(inside).filter((x): x is boolean => x !== null);
        const p = poor.map(inside).filter((x): x is boolean => x !== null);
        const goodIn = g.length ? g.filter(Boolean).length / g.length : 1;
        const poorOut = p.length ? p.filter(x => !x).length / p.length : 0;
        const sep = Math.max(0, goodIn + poorOut - 1);
        const importance = Math.max(0.05, (LEARN.baseWeight * LEARN.baseImportance + p.length * sep) / (LEARN.baseWeight + p.length));
        params.push({ ...r, importance });
    }
    const model: SportModel = { sport, params, sessions: samples.length, great: samples.filter(s => s.rating >= 4).length, poor: poor.length, fitRating: LEARN.startRating };
    // how your sessions went when the conditions fitted
    const fitting = samples.filter(s => (scoreOf(model, s)?.score ?? 0) >= LEARN.fitFrom);
    model.fitRating = (fitting.reduce((a, s) => a + s.rating, 0) + LEARN.startRating * LEARN.startWeight) / (fitting.length + LEARN.startWeight);
    return model;
};

/** Everything learned about a spot: one model per sport */
export const learnSpot = (spot: Spot, samples: Sample[]): SportModel[] => sportsOf(spot).map(sp => learnSport(spot, sp, samples));

export interface Guess {
    /** 1–5, or null = not sure yet */
    rating: number | null;
    sport: string;
    /** 0–1 fit */
    score: number;
    /** sessions this sport has here */
    sessions: number;
    /** your sessions here took part (else only the wind window) */
    learned: boolean;
    parts: Part[];
}

/** The guess for one sport: fit × how good your fitting days were */
export const guessSport = (m: SportModel, c: Conditions | null): Guess | null => {
    if (!c || c.wind === null) {return null;}
    const s = scoreOf(m, c);
    const learned = m.sessions > 0;
    if (!s) {return { rating: null, sport: m.sport, score: 0, sessions: m.sessions, learned, parts: [] };}
    return { rating: 1 + (m.fitRating - 1) * s.score, sport: m.sport, score: s.score, sessions: m.sessions, learned, parts: s.parts };
};

/** The best guess over the spot's sports */
export const guess = (models: SportModel[], c: Conditions | null): Guess | null => {
    let best: Guess | null = null;
    for (const m of models) {
        const g = guessSport(m, c);
        if (g && (!best || (g.rating ?? 0) > (best.rating ?? 0))) {best = g;}
    }
    return best;
};

/** Only good news is shown: 3 good, 4 great, 5 epic; 0 = not sure yet */
export const shownLevel = (r: number | null): number => (r === null ? 0 : r >= 4.2 ? 5 : r >= 3.5 ? 4 : r >= 2.7 ? 3 : 0);

/** "matters a lot" (3), "matters" (2), "matters little" (1) */
export const importanceLevel = (x: number): number => (x >= 0.65 ? 3 : x >= 0.35 ? 2 : 1);

/* ---------- the best window of the day ---------- */

export interface Hour extends Conditions { ts: number; day: boolean }

export interface DayBest {
    start: number;
    end: number;
    rating: number;
    level: number;
    sport: string;
    sessions: number;
    learned: boolean;
    /** the window is going on right now */
    now: boolean;
}

/**
 * The best stretch of the rest of today: consecutive daylight hours that look good or better (for the same sport),
 * the one with the best guess wins (the earlier one on a tie).
 */
export const bestToday = (models: SportModel[], hours: Hour[], now = Date.now()): DayBest | null => {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const step = hours.length > 1 ? Math.min(...hours.slice(1).map((h, i) => h.ts - hours[i].ts)) : 3600e3;
    const list = hours.filter(h => h.ts + step / 2 > now && h.ts <= end.getTime());
    let best: DayBest | null = null;
    for (const m of models) {
        let run: { h: Hour; g: Guess }[] = [];
        const close = () => {
            if (!run.length) {return;}
            const r = run.reduce((a, x) => a + (x.g.rating as number), 0) / run.length;
            const cand: DayBest = {
                start: run[0].h.ts, end: run[run.length - 1].h.ts + step, rating: r, level: shownLevel(r), sport: m.sport,
                sessions: m.sessions, learned: run[0].g.learned, now: run[0].h.ts - step / 2 <= now,
            };
            if (cand.level && (!best || cand.rating > best.rating + 0.05)) {best = cand;}
            run = [];
        };
        for (const h of list) {
            const g = h.day ? guessSport(m, h) : null;
            if (g && shownLevel(g.rating) >= 3) {run.push({ h, g });} else {close();}
        }
        close();
    }
    return best;
};

/* ---------- "I don't know yet" spots ---------- */

const dirOf = (deg: number): Dir8 => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

export interface WindSuggestion {
    dirs: Dir8[];
    min: number;
    max: number;
    basedOn: number;
}

/** "I don't know yet" spots: the wind window your sessions rated great or epic had */
export const suggestWindow = (spot: Spot, sessions: Session[], snapshots: Snapshot[]): WindSuggestion | null => {
    const good = samplesFor(spot, sessions, snapshots).filter(s => s.rating >= 4 && s.wind !== null && s.dir !== null);
    if (good.length < 2) {return null;}
    const dirs = Array.from(new Set(good.map(s => dirOf(s.dir as number))));
    const winds = good.map(s => s.wind as number);
    return {
        dirs: DIRS.filter(d => dirs.includes(d)),
        min: Math.max(0, Math.floor(Math.min(...winds) - 1)),
        max: Math.ceil(Math.max(...winds) + 1),
        basedOn: good.length,
    };
};

/** Directions of a learned range, as compass sectors (for "W–SW") */
export const dirsOfParam = (p: ParamModel): Dir8[] => {
    const set = new Set((p.centres || []).map(dirOf));
    return DIRS.filter(d => set.has(d));
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

export const MIN_SAMPLES = 2;
