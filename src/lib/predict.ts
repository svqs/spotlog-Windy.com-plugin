import { DIRS, distanceKm } from './wind';
import type { Dir8, Session, Snapshot, Spot, ModelValue, WaveValue } from './types';

/*
 * How spotlog learns what works at a spot
 * ---------------------------------------
 * 1. Every sport has its own conditions (windsurf: wind, direction, gusts, waves, temperature, rain;
 *    surf: swell, period, swell direction, wave energy, wind, direction, temperature, rain; …).
 * 2. Per spot and sport, each condition gets an ideal range: your wind window at first, then the forecast
 *    of your great sessions (the spot's model at the session time). You can also set a range yourself.
 * 3. Each condition learns how much it matters here: great sessions inside its range and poor ones outside
 *    = it decides the day. Main conditions start at "matters", extras (temperature, rain, wave energy) at "matters little".
 * 4. The guess = how well the conditions fit (important ones count more; one that matters and is clearly off
 *    pulls the day down), times how your sessions went when conditions fitted. Only good, great, epic are shown.
 */

export type ParamKey = 'wind' | 'gust' | 'dir' | 'waves' | 'swell' | 'period' | 'swellDir' | 'power' | 'temp' | 'rain';

export interface Conditions {
    wind: number | null;
    gust: number | null;
    dir: number | null;
    waves: number | null;
    period?: number | null;
    wavesDir?: number | null;
    power?: number | null;
    swell?: number | null;
    swellPeriod?: number | null;
    swellDir?: number | null;
    temp?: number | null;
    rain?: number | null;
}

/**
 * Per condition: circular (a direction), main or extra (where importance starts),
 * the least a learned range is widened by, and how far beyond the edge the fit has dropped to 0 (at least).
 */
const SPEC: Record<ParamKey, { circular?: boolean; main: boolean; widen: number; tol: number }> = {
    wind: { main: true, widen: 0.5, tol: 1.5 },
    gust: { main: true, widen: 0.5, tol: 1.5 },
    dir: { circular: true, main: true, widen: 0, tol: 30 },
    waves: { main: true, widen: 0.1, tol: 0.25 },
    swell: { main: true, widen: 0.1, tol: 0.25 },
    period: { main: true, widen: 1, tol: 2 },
    swellDir: { circular: true, main: true, widen: 0, tol: 30 },
    power: { main: false, widen: 0.5, tol: 2 },
    temp: { main: false, widen: 2, tol: 5 },
    rain: { main: false, widen: 0.5, tol: 1 },
};
export const isCircular = (k: ParamKey): boolean => !!SPEC[k].circular;

/** The conditions that matter per sport */
export const SPORT_PARAMS: Record<string, ParamKey[]> = {
    Windsurf: ['wind', 'dir', 'gust', 'waves', 'temp', 'rain'],
    Kite: ['wind', 'dir', 'gust', 'waves', 'temp', 'rain'],
    Wing: ['wind', 'dir', 'gust', 'waves', 'temp', 'rain'],
    Surf: ['swell', 'period', 'swellDir', 'power', 'wind', 'dir', 'temp', 'rain'],
    SUP: ['wind', 'dir', 'waves', 'temp', 'rain'],
    Other: ['wind', 'dir', 'waves', 'temp', 'rain'],
};
export const paramsOf = (sport: string): ParamKey[] => SPORT_PARAMS[sport] || SPORT_PARAMS.Other;
export const sportsOf = (spot: Spot): string[] => (spot.sports.length ? spot.sports : ['Other']);

/** The value of one condition (gusts in m/s like the wind; surf uses swell when the forecast has it) */
export const valueOf = (c: Conditions, k: ParamKey): number | null => {
    switch (k) {
        case 'wind': return c.wind;
        case 'gust': return c.gust;
        case 'dir': return c.dir;
        case 'waves': return c.waves;
        case 'swell': return c.swell ?? c.waves;
        case 'period': return c.swellPeriod ?? c.period ?? null;
        case 'swellDir': return c.swellDir ?? c.wavesDir ?? null;
        case 'power': return c.power ?? null;
        case 'temp': return c.temp ?? null;
        case 'rain': return c.rain ?? null;
    }
};

export const conditionsOf = (m: ModelValue | null | undefined, wv?: WaveValue | null): Conditions | null =>
    m ? {
        wind: m.wind, gust: m.gust, dir: m.dir, temp: m.temp, rain: m.rain ?? null,
        waves: wv?.waves ?? null, period: wv?.wavesPeriod ?? null, wavesDir: wv?.wavesDir ?? null, power: wv?.wavesPower ?? null,
        swell: wv?.swell1 ?? null, swellPeriod: wv?.swell1Period ?? null, swellDir: wv?.swell1Dir ?? null,
    } : null;

export interface Sample extends Conditions {
    rating: number;
    sport: string;
    /** 1 = counts fully; 0.5 = the forecast was far off how it felt, or the session is from a spot next door */
    weight: number;
    gearIds: string[];
    tide: string | null;
    tideMove: string | null;
}

/** When the session happened: its start plus half the time out (the date already is the start time when one was set) */
export const sessionTime = (s: Session): number => {
    const mins = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
    if (/^\d\d:\d\d$/.test(s.start) && /^\d\d:\d\d$/.test(s.end)) {
        const dur = (mins(s.end) - mins(s.start) + 1440) % 1440;
        return s.date + (dur / 2) * 60e3;
    }
    return s.date;
};

const nearest = (list: number[], ts: number): number => {
    let best = 0;
    for (let i = 1; i < list.length; i++) {if (Math.abs(list[i] - ts) < Math.abs(list[best] - ts)) {best = i;}}
    return best;
};

/**
 * The forecast of a saved day at the session time, from the spot's model (ECMWF unless another one has been
 * more accurate here). A session outside the saved hours has no forecast to compare with: left out.
 */
const forecastFor = (sn: Snapshot, ts: number, model: string): Conditions | null => {
    const sr = sn.series;
    if (sr && sr.ts.length) {
        if (ts < sr.ts[0] - 3600e3 || ts > sr.ts[sr.ts.length - 1] + 3600e3) {return null;}
        const i = nearest(sr.ts, ts);
        const m = sr.models[model] || sr.models.ecmwf || sr.models[sn.primary] || Object.values(sr.models)[0];
        const w = sr.waves;
        if (!m || m.wind[i] == null || m.dir[i] == null) {return null;}
        return {
            wind: m.wind[i], gust: m.gust[i] ?? null, dir: m.dir[i], temp: m.temp[i] ?? null, rain: m.rain?.[i] ?? null,
            waves: w?.waves[i] ?? null, period: w?.wavesPeriod[i] ?? null, wavesDir: w?.wavesDir[i] ?? null, power: w?.wavesPower[i] ?? null,
            swell: w?.swell1[i] ?? null, swellPeriod: w?.swell1Period[i] ?? null, swellDir: w?.swell1Dir[i] ?? null,
        };
    }
    // older saves without the whole day: only when saved for (about) the session time
    if (Math.abs(sn.ts - ts) > 1.5 * 3600e3) {return null;}
    const p = sn.models.find(m => m.model === model) || sn.models.find(m => m.model === 'ecmwf') || sn.models[0];
    return p ? conditionsOf(p, sn.waves) : null;
};

/** Sessions at a spot that have a forecast for their time (the forecast is what we compare against) */
export const samplesFor = (spot: Spot, sessions: Session[], snapshots: Snapshot[], model = 'ecmwf', weight = 1): Sample[] =>
    sessions
        .filter(s => s.spotId === spot.id && s.snapshotId)
        .map(s => {
            const sn = snapshots.find(x => x.id === s.snapshotId);
            const c = sn ? forecastFor(sn, sessionTime(s), model) : null;
            if (!c || c.wind === null || c.dir === null) {return null;}
            const sport = s.sport && spot.sports.includes(s.sport) ? s.sport : sportsOf(spot)[0];
            // the forecast was far off how it felt: that day says less about the forecast
            const off = s.felt !== null && c.wind > 1 && Math.abs(s.felt - c.wind) > c.wind / 3;
            return { ...c, rating: s.rating, sport, weight: weight * (off ? 0.5 : 1), gearIds: s.gearIds || [], tide: s.tide ?? null, tideMove: s.tideMove ?? null };
        })
        .filter((x): x is Sample => !!x);

/** Spots next door (within 3 km) learn from each other at half weight */
export const nearbySpots = (spot: Spot, spots: Spot[], km = 3): Spot[] =>
    spots.filter(o => o.id !== spot.id && distanceKm(spot, o) <= km);

/* ---------- learning ---------- */

/** the settings of the learning, in one place */
export const LEARN = {
    /** great sessions needed before a range is learned from sessions */
    minGood: 2,
    /** from this many, the outer 10 % on each side are ignored (one odd day doesn't stretch the range) */
    trimFrom: 6,
    /** a learned range is widened by this share on each side (at least the condition's own minimum) */
    margin: 0.1,
    /** half-width around each great session's direction */
    dirHalf: 20,
    /** the fit drops to 0 this far beyond the edge (25 %, at least the condition's own minimum) */
    tolerance: 0.25,
    /** importance before poor sessions say otherwise: main conditions, extras; and how many poor sessions that counts as */
    baseMain: 0.5,
    baseExtra: 0.25,
    baseWeight: 2,
    /** the rating a perfect fit means before your sessions say (between good and great), and how many sessions that counts as */
    startRating: 3.4,
    startWeight: 2,
    /** how much a range you set yourself matters (at least) */
    yours: 0.8,
    /** a session "fits" from this score */
    fitFrom: 0.85,
};

export interface ParamModel {
    key: ParamKey;
    /** linear range (wind m/s, gust factor, m, s, kW/m, °C, mm) */
    lo?: number;
    hi?: number;
    /** directions: centres and the half-width around each */
    centres?: number[];
    half?: number;
    /** where the range comes from: your wind window, your sessions, or set by you */
    from: 'window' | 'sessions' | 'you';
    /** 0–1: how much this condition decides a good day here */
    importance: number;
}

export interface SportModel {
    sport: string;
    params: ParamModel[];
    sessions: number;
    great: number;
    poor: number;
    /** how your sessions went when the conditions fitted (1–5) */
    fitRating: number;
    /** felt − forecast at this spot (m/s), used when comparing with your wind window */
    bias: number | null;
}

/** Your own range for a condition (spot.ranges[sport][key]) */
export interface OwnRange { lo?: number; hi?: number; dirs?: Dir8[] }

const angDiff = (a: number, b: number): number => Math.abs((((a - b) % 360) + 540) % 360 - 180);
const pct = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
const wsum = (list: Sample[]) => list.reduce((a, s) => a + s.weight, 0);

/** 0–1: how well one value fits one range (1 inside, falling to 0 beyond it) */
export const fitOf = (p: ParamModel, v: number): number => {
    const spec = SPEC[p.key];
    if (p.centres) {
        const excess = Math.min(...p.centres.map(c => angDiff(c, v))) - (p.half ?? 0);
        return excess <= 0 ? 1 : Math.max(0, 1 - excess / spec.tol);
    }
    const lo = p.lo ?? -Infinity;
    const hi = p.hi ?? Infinity;
    if (v >= lo && v <= hi) {return 1;}
    const edge = v < lo ? lo : hi;
    const beyond = Math.abs(v - edge);
    return Math.max(0, 1 - beyond / Math.max(LEARN.tolerance * Math.abs(edge), spec.tol));
};

/** Your wind window is in "how it feels"; the forecast is shifted by this spot's bias before comparing with it */
const adjusted = (p: ParamModel, v: number, bias: number | null): number => (p.from === 'window' && p.key === 'wind' && bias ? v + bias : v);

const rangeOf = (spot: Spot, sport: string, key: ParamKey, good: Sample[]): Omit<ParamModel, 'importance'> | null => {
    const own = spot.ranges?.[sport]?.[key];
    if (own) {
        if (own.dirs?.length) {return { key, centres: own.dirs.map(d => DIRS.indexOf(d) * 45), half: 22.5, from: 'you' };}
        // (gust ranges from 0.14.0 were a gust factor, 1–2: those are skipped)
        const oldFactor = key === 'gust' && (own.lo ?? 0) < 3 && (own.hi ?? 0) < 3;
        if (!oldFactor && (typeof own.lo === 'number' || typeof own.hi === 'number')) {return { key, lo: own.lo, hi: own.hi, from: 'you' };}
    }
    const withValue = good.filter(s => valueOf(s, key) !== null);
    const vals = withValue.map(s => valueOf(s, key) as number);
    if (vals.length && wsum(withValue) >= LEARN.minGood) {
        if (isCircular(key)) {return { key, centres: vals, half: LEARN.dirHalf, from: 'sessions' };}
        const sorted = [...vals].sort((a, b) => a - b);
        const trim = sorted.length >= LEARN.trimFrom;
        const lo = trim ? pct(sorted, 0.1) : sorted[0];
        const hi = trim ? pct(sorted, 0.9) : sorted[sorted.length - 1];
        const w = (x: number) => Math.max(LEARN.margin * Math.abs(x), SPEC[key].widen);
        return { key, lo: key === 'temp' ? lo - w(lo) : Math.max(0, lo - w(lo)), hi: hi + w(hi), from: 'sessions' };
    }
    if (spot.windUnknown) {return null;}
    if (key === 'wind') {return { key, lo: spot.min, hi: spot.max, from: 'window' };}
    if (key === 'dir' && spot.dirs.length) {return { key, centres: spot.dirs.map(d => DIRS.indexOf(d) * 45), half: 22.5, from: 'window' };}
    return null;
};

export interface LearnOptions {
    /** felt − forecast at this spot, when known */
    bias?: number | null;
    /** start from your own average rating instead of 3.4 (when you chose it for this spot) */
    startRating?: number;
}

/** What spotlog has learned about one sport at one spot */
export const learnSport = (spot: Spot, sport: string, all: Sample[], o: LearnOptions = {}): SportModel => {
    const samples = all.filter(s => s.sport === sport);
    const bias = o.bias ?? null;
    let good = samples.filter(s => s.rating >= 4);
    if (wsum(good) < LEARN.minGood) {good = samples.filter(s => s.rating >= 3);}
    const poor = samples.filter(s => s.rating <= 2);
    const params: ParamModel[] = [];
    for (const key of paramsOf(sport)) {
        const r = rangeOf(spot, sport, key, good);
        if (!r) {continue;}
        // how much it matters: great sessions inside and poor ones outside = it decides the day
        const inside = (s: Sample) => { const v = valueOf(s, key); return v === null ? null : fitOf(r as ParamModel, adjusted(r as ParamModel, v, bias)) >= 0.99; };
        const share = (list: Sample[], want: boolean) => {
            const known = list.filter(s => inside(s) !== null);
            const w = wsum(known);
            return { w, share: w ? wsum(known.filter(s => inside(s) === want)) / w : null };
        };
        const g = share(good, true);
        const p = share(poor, false);
        const sep = Math.max(0, (g.share ?? 1) + (p.share ?? 0) - 1);
        const base = SPEC[key].main ? LEARN.baseMain : LEARN.baseExtra;
        const learned = Math.max(0.05, (LEARN.baseWeight * base + p.w * sep) / (LEARN.baseWeight + p.w));
        // a range you set yourself is something you know matters
        const importance = r.from === 'you' ? Math.max(learned, LEARN.yours) : learned;
        params.push({ ...r, importance });
    }
    const start = o.startRating ?? LEARN.startRating;
    const model: SportModel = { sport, params, sessions: samples.length, great: samples.filter(s => s.rating >= 4).length, poor: poor.length, fitRating: start, bias };
    const fitting = samples.filter(s => (scoreOf(model, s)?.score ?? 0) >= LEARN.fitFrom);
    model.fitRating = (fitting.reduce((a, s) => a + s.rating * s.weight, 0) + start * LEARN.startWeight) / (wsum(fitting) + LEARN.startWeight);
    return model;
};

/** Everything learned about a spot: one model per sport */
export const learnSpot = (spot: Spot, samples: Sample[], o: LearnOptions = {}): SportModel[] => sportsOf(spot).map(sp => learnSport(spot, sp, samples, o));

export interface Part { key: ParamKey; value: number; fit: number; param: ParamModel }

/** 0–1: how well conditions fit what works (important conditions count more), with the part each condition plays */
export function scoreOf(m: SportModel, c: Conditions): { score: number; parts: Part[] } | null {
    let wSum = 0;
    let sSum = 0;
    // something that matters and is clearly off pulls the whole day down by how much it matters
    let off = 1;
    const parts: Part[] = [];
    for (const p of m.params) {
        const v = valueOf(c, p.key);
        if (v === null) {continue;}
        const fit = fitOf(p, adjusted(p, v, m.bias));
        wSum += p.importance;
        sSum += p.importance * fit;
        if (fit === 0) {off *= 1 - p.importance;}
        parts.push({ key: p.key, value: v, fit, param: p });
    }
    return wSum > 0 ? { score: (sSum / wSum) * off, parts } : null;
}

export interface Guess {
    /** 1–5, or null = not sure yet */
    rating: number | null;
    sport: string;
    score: number;
    sessions: number;
    /** your sessions here took part (else only the wind window) */
    learned: boolean;
    parts: Part[];
}

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

/* ---------- best windows: today and the next days ---------- */

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

/** The best stretch between two times: back-to-back daylight hours that look good or better (one sport), best average wins */
export const bestIn = (models: SportModel[], hours: Hour[], from: number, to: number, now = Date.now()): DayBest | null => {
    const step = hours.length > 1 ? Math.max(3600e3, Math.min(...hours.slice(1).map((h, i) => h.ts - hours[i].ts))) : 3600e3;
    const list = hours.filter(h => h.ts + step / 2 > Math.max(from, now) && h.ts <= to);
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

/** The rest of today */
export const bestToday = (models: SportModel[], hours: Hour[], now = Date.now()): DayBest | null => {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return bestIn(models, hours, now, end.getTime(), now);
};

export interface DayOutlook { day: number; best: DayBest | null }

/** The next days (tomorrow on), each with its best stretch */
export const nextDays = (models: SportModel[], hours: Hour[], days = 5, now = Date.now()): DayOutlook[] => {
    const out: DayOutlook[] = [];
    const d0 = new Date(now);
    d0.setHours(0, 0, 0, 0);
    for (let k = 1; k <= days; k++) {
        const a = new Date(d0);
        a.setDate(a.getDate() + k);
        const b = new Date(a);
        b.setHours(23, 59, 59, 999);
        if (!hours.some(h => h.ts >= a.getTime() && h.ts <= b.getTime())) {break;}
        out.push({ day: a.getTime(), best: bestIn(models, hours, a.getTime(), b.getTime(), now) });
    }
    return out;
};

/* ---------- "I don't know yet" spots, and "use what spotlog learned" ---------- */

const dirOf = (deg: number): Dir8 => DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

export interface WindSuggestion {
    dirs: Dir8[];
    min: number;
    max: number;
    basedOn: number;
}

/** "I don't know yet" spots: the wind your great sessions had */
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

/** Directions of a range, as compass sectors (for "W–SW") */
export const dirsOfParam = (p: ParamModel): Dir8[] => {
    const set = new Set((p.centres || []).map(dirOf));
    return DIRS.filter(d => set.has(d));
};

/** The wind window as learned (first sport), when it differs from yours: for "Use what spotlog learned" */
export const learnedWindow = (spot: Spot, m: SportModel | undefined): WindSuggestion | null => {
    const w = m?.params.find(p => p.key === 'wind' && p.from === 'sessions');
    const d = m?.params.find(p => p.key === 'dir' && p.from === 'sessions');
    if (!m || (!w && !d)) {return null;}
    const out = {
        dirs: d ? dirsOfParam(d) : spot.dirs,
        min: w ? Math.round((w.lo ?? spot.min) * 2) / 2 : spot.min,
        max: w ? Math.round((w.hi ?? spot.max) * 2) / 2 : spot.max,
        basedOn: m.sessions,
    };
    const same = out.dirs.length === spot.dirs.length && out.dirs.every(x => spot.dirs.includes(x)) && Math.abs(out.min - spot.min) < 0.5 && Math.abs(out.max - spot.max) < 0.5;
    return same ? null : out;
};

/* ---------- gear: after many sessions with one piece of gear here, the wind it was great in ---------- */

export const GEAR_MIN_SESSIONS = 8;
export interface GearHint { gearId: string; lo: number; hi: number; sessions: number }

export const gearHints = (samples: Sample[]): GearHint[] => {
    const ids = new Set(samples.flatMap(s => s.gearIds));
    const out: GearHint[] = [];
    ids.forEach(id => {
        const used = samples.filter(s => s.gearIds.includes(id));
        const great = used.filter(s => s.rating >= 4 && s.wind !== null).map(s => s.wind as number);
        if (used.length >= GEAR_MIN_SESSIONS && great.length >= 3) {out.push({ gearId: id, lo: Math.min(...great), hi: Math.max(...great), sessions: used.length });}
    });
    return out;
};

/* ---------- tide: you know it; your best sessions show which tide works ---------- */

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

/** Your average rating everywhere (for "start from my own ratings"), from 5 sessions */
export const ownAverage = (sessions: Session[]): number | null => {
    const list = sessions.filter(s => !s.checked);
    return list.length >= 5 ? list.reduce((a, s) => a + s.rating, 0) / list.length : null;
};

export const MIN_SAMPLES = 2;
