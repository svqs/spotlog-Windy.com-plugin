/**
 * spotlog – tide core
 *
 * Pure tide logic with no Windy imports, so it can be unit-tested in Node:
 * parsing Windy's tide response and working out the tide state (phase,
 * height, range) at a session's time.
 *
 * All times are milliseconds since epoch, UTC. All heights are metres.
 */

export type TideType = 'high' | 'low';

export interface TidePoint {
    t: number;
    h: number;
}

export interface TideExtreme {
    t: number;
    type: TideType;
    h: number;
}

/**
 * Everything stored with a conditions snapshot. Holds the whole tide window,
 * so a session logged later can be placed in it without another request.
 */
export interface TideSnapshot {
    v: 1;
    takenAt: number;
    lat: number;
    lon: number;
    /** Window covered by the data. */
    from: number;
    to: number;
    /** Water levels (hourly plus each extreme), sorted by time. */
    points: TidePoint[];
    /** Highs and lows, sorted by time. */
    extremes: TideExtreme[];

    /** Heights are above a chart level that Windy doesn't name. */
    datum: 'chart';
    /** Required credit for the data, shown in the plugin's About/credits, not per snapshot. */
    attribution: string;
}

/** Tide state at one moment. */
export interface TideAt {
    t: number;
    /** Interpolated water level. */
    h: number;
    rising: boolean;
    prev: TideExtreme;
    next: TideExtreme;
    /** Signed hours from the nearest high: -3 = three hours before high, +2 = two hours after. */
    hoursFromHigh: number;
    /** Signed hours from the nearest low. */
    hoursFromLow: number;
    /** 0 at low water, 1 at high water, between the bracketing low and high. */
    rangeFraction: number;
    /** Height difference between the bracketing low and high (spring vs neap). */
    rangeM: number;
    /** True when a bracketing extreme had to be estimated beyond the window edge. */
    approx: boolean;
}

export interface SessionTide {
    /** Session start and end both fall inside the snapshot's window. */
    covered: boolean;
    start: TideAt | null;
    end: TideAt | null;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Extremes closer than this in height are treated as noise (micro-tidal coasts). */
export const MIN_EXTREME_DH_M = 0.05;

export const startOfUtcDay = (t: number): number => Math.floor(t / DAY) * DAY;

// ---------------------------------------------------------------------------
// Windy response
// ---------------------------------------------------------------------------

export const WINDY_DEFAULT_ATTRIBUTION =
    'Tidal data retrieved from www.worldtides.info. Copyright (c) 2014-2026 Brainware LLC. ' +
    'Generated using AVISO+ FES2022 produced by Noveltis, Legos and CLS and distributed by Aviso+, with support from CNES.';

export type WindyParseResult =
    | { ok: true; snapshot: TideSnapshot }
    | { ok: false; problem: 'shape' | 'too-few-extremes' | 'stale-window'; signature: string };

/**
 * Parse Windy's `/tides/v1.0/tides/{lat}/{lon}` response:
 * `{ header: { copyright }, data: { hours: number[], types: ('High'|'Low'|null)[], heights: number[] } }`.
 *
 * Validates strictly. Anything unexpected comes back as a problem plus a
 * value-free signature of the response, which is safe to report.
 */
export const parseWindyTides = (
    payload: unknown,
    lat: number,
    lon: number,
    now: number,
): WindyParseResult => {
    const fail = (problem: 'shape' | 'too-few-extremes' | 'stale-window'): WindyParseResult => ({
        ok: false,
        problem,
        signature: shapeSignature(payload),
    });

    const data = (payload as { data?: unknown } | null)?.data as
        | { hours?: unknown; types?: unknown; heights?: unknown }
        | undefined;
    const { hours, types, heights } = data ?? {};

    if (!Array.isArray(hours) || !Array.isArray(types) || !Array.isArray(heights)) {
        return fail('shape');
    }
    const n = hours.length;
    if (n < 24 || types.length !== n || heights.length !== n) {
        return fail('shape');
    }

    const points: TidePoint[] = [];
    const extremes: TideExtreme[] = [];

    for (let i = 0; i < n; i++) {
        const t = hours[i];
        const h = heights[i];
        const ty = types[i];

        if (typeof t !== 'number' || !Number.isFinite(t) || t < 1e12) {
            return fail('shape'); // expect epoch milliseconds
        }
        if (i > 0 && t < (hours[i - 1] as number)) {
            return fail('shape'); // must be ascending
        }
        if (typeof h !== 'number' || !Number.isFinite(h) || Math.abs(h) > 30) {
            return fail('shape');
        }

        // a high or low exactly on the hour can come twice (as the hour and as the extreme): one point
        if (!(i > 0 && t === hours[i - 1])) {
            points.push({ t, h });
        }

        if (ty === null || ty === undefined) {
            continue;
        }
        if (typeof ty !== 'string') {
            return fail('shape');
        }
        const lower = ty.toLowerCase();
        if (lower !== 'high' && lower !== 'low') {
            return fail('shape');
        }
        extremes.push({ t, type: lower, h });
    }

    const cleaned = dropTinyWiggles(extremes);
    if (cleaned.length < 2) {
        return fail('too-few-extremes');
    }

    const from = points[0].t;
    const to = points[points.length - 1].t;
    // The snapshot must cover "now"; allow an hour of slack for clock skew.
    if (now < from - HOUR || now > to) {
        return fail('stale-window');
    }

    const copyright = (payload as { header?: { copyright?: unknown } })?.header?.copyright;

    return {
        ok: true,
        snapshot: {
            v: 1,
            takenAt: now,
            lat,
            lon,
            from,
            to,
            points,
            extremes: cleaned,
            datum: 'chart',
            attribution: typeof copyright === 'string' && copyright ? copyright : WINDY_DEFAULT_ATTRIBUTION,
        },
    };
};

/**
 * Describe a value's structure without any of its values, e.g.
 * `{data:{heights:array(196)<number>,hours:array(196)<number>,types:array(196)<string|null>},header:{copyright:string}}`.
 * Safe to send in an error report: no coordinates, no data.
 */
export function shapeSignature(value: unknown, depth = 0): string {
    const MAX = 400;
    const sig = (v: unknown, d: number): string => {
        if (v === null) {return 'null';}
        if (Array.isArray(v)) {
            const kinds = new Set<string>();
            for (const item of v.slice(0, 50)) {
                kinds.add(item === null ? 'null' : Array.isArray(item) ? 'array' : typeof item);
            }
            return `array(${v.length})<${[...kinds].sort().join('|') || 'empty'}>`;
        }
        if (typeof v === 'object') {
            if (d >= 3) {return 'object';}
            const keys = Object.keys(v as object).sort().slice(0, 12);
            return `{${keys.map(k => `${k}:${sig((v as Record<string, unknown>)[k], d + 1)}`).join(',')}}`;
        }
        return typeof v;
    };
    const s = sig(value, depth);
    return s.length > MAX ? `${s.slice(0, MAX)}…` : s;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Remove pairs of extremes that differ by only a few centimetres. Micro-tidal
 * coasts (North Sea, Mediterranean) otherwise produce a high and a low an hour
 * apart, which would scramble the phase features.
 */
export function dropTinyWiggles(extremes: TideExtreme[], minDh = MIN_EXTREME_DH_M): TideExtreme[] {
    const out: TideExtreme[] = [];
    for (const e of extremes) {
        const last = out[out.length - 1];
        if (last && last.type === e.type) {
            // Two of the same in a row: keep the more extreme one.
            const keepNew = e.type === 'high' ? e.h > last.h : e.h < last.h;
            if (keepNew) {out[out.length - 1] = e;}
            continue;
        }
        if (last && Math.abs(e.h - last.h) < minDh) {
            out.pop(); // drop the tiny pair
            continue;
        }
        out.push(e);
    }
    return out;
}

/** Linear interpolation of the water level at `t`; null outside the points. */
export const levelAt = (points: TidePoint[], t: number): number | null => {
    if (!points.length || t < points[0].t || t > points[points.length - 1].t) {return null;}
    let lo = 0;
    let hi = points.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (points[mid].t <= t) {lo = mid;}
        else {hi = mid;}
    }
    const a = points[lo];
    const b = points[hi];
    if (b.t === a.t) {return a.h;}
    return a.h + ((b.h - a.h) * (t - a.t)) / (b.t - a.t);
};

/** Mirror an extreme across its neighbour to estimate one just beyond the window. */
function mirror(edge: TideExtreme, inner: TideExtreme): TideExtreme {
    return { t: edge.t - (inner.t - edge.t), type: inner.type, h: inner.h };
}

/** Tide state at `t`, or null when `t` is outside the snapshot's window. */
export const tideAt = (snap: TideSnapshot, t: number): TideAt | null => {
    if (t < snap.from || t > snap.to) {return null;}
    const ex = snap.extremes;
    if (ex.length < 2) {return null;}

    let approx = false;
    const i = ex.findIndex(e => e.t > t); // index of next extreme
    let prev: TideExtreme;
    let next: TideExtreme;

    if (i === -1) {
        // After the last extreme: estimate the next one.
        prev = ex[ex.length - 1];
        next = mirror(prev, ex[ex.length - 2]);
        approx = true;
    } else if (i === 0) {
        // Before the first extreme: estimate the previous one.
        next = ex[0];
        prev = mirror(next, ex[1]);
        approx = true;
    } else {
        prev = ex[i - 1];
        next = ex[i];
    }

    const h = levelAt(snap.points, t) ?? cosineLevel(prev, next, t);
    const low = Math.min(prev.h, next.h);
    const high = Math.max(prev.h, next.h);
    const rangeM = high - low;
    const rangeFraction = rangeM < 1e-3 ? 0.5 : clamp01((h - low) / rangeM);

    const nearest = (type: TideType): TideExtreme => {
        const candidates = [...ex, prev, next].filter(e => e.type === type);
        return candidates.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
    };

    return {
        t,
        h: round3(h),
        rising: next.type === 'high',
        prev,
        next,
        hoursFromHigh: round2((t - nearest('high').t) / HOUR),
        hoursFromLow: round2((t - nearest('low').t) / HOUR),
        rangeFraction: round3(rangeFraction),
        rangeM: round3(rangeM),
        approx,
    };
};

/** Tide at a session's start and end. `covered` is false if either falls outside the window. */
export const tideForSession = (snap: TideSnapshot, startMs: number, endMs: number = startMs): SessionTide => {
    const start = tideAt(snap, startMs);
    const end = tideAt(snap, endMs);
    return { covered: !!start && !!end, start, end };
};

/** Standard cosine shape between two extremes; used only if points are missing. */
function cosineLevel(a: TideExtreme, b: TideExtreme, t: number): number {
    const f = clamp01((t - a.t) / (b.t - a.t));
    return a.h + ((b.h - a.h) * (1 - Math.cos(Math.PI * f))) / 2;
}

function clamp01(x: number): number {
    return Math.min(1, Math.max(0, x));
}
function round2(x: number): number {
    return Math.round(x * 100) / 100;
}
function round3(x: number): number {
    return Math.round(x * 1000) / 1000;
}

/** For spotlog's saved day: the highs and lows from..to (times and heights), plus the one just before (estimated when the window starts later), so every hour sits between a high and a low */
export function highsAndLows(extremes: TideExtreme[], from: number, to: number): { highs: number[]; lows: number[]; highsM: number[]; lowsM: number[] } | null {
    const ex = [...extremes];
    if (ex.length >= 2 && ex[0].t > from) {ex.unshift({ t: ex[0].t - (ex[1].t - ex[0].t), type: ex[1].type, h: ex[1].h });}
    const before = ex.filter(e => e.t < from).pop();
    const after = ex.find(e => e.t >= to);
    const pick = [before, ...ex.filter(e => e.t >= from && e.t < to), after].filter((e): e is TideExtreme => !!e);
    if (!pick.length) {return null;}
    const highs = pick.filter(e => e.type === 'high');
    const lows = pick.filter(e => e.type === 'low');
    return { highs: highs.map(e => e.t), lows: lows.map(e => e.t), highsM: highs.map(e => e.h), lowsM: lows.map(e => e.h) };
}
