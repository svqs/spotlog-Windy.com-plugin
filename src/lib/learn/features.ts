/**
 * Forecast features: what a sport looks at, how a stretch of forecast hours becomes one set of values,
 * and how far apart two sets of values are. Outings and future windows use the same functions.
 */
import { SCALE, SIMILAR } from './config';

export type Feature = 'wind' | 'gust' | 'dir' | 'waves' | 'swell' | 'period' | 'swellDir' | 'power' | 'temp' | 'rain';
export type Features = Partial<Record<Feature, number | null>>;

/** Forecast values at one time, as forecast.ts reads them (SI units) */
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
/** One forecast hour (forecast.ts → hoursBetween) */
export interface Hour extends Conditions { ts: number; day: boolean }

/** Per sport: the features that must be there (they count double), and the ones that help when there */
export const SPORT_FEATURES: Record<string, { core: Feature[]; extra: Feature[] }> = {
    Windsurf: { core: ['wind', 'dir'], extra: ['gust', 'waves', 'temp', 'rain'] },
    Kite: { core: ['wind', 'dir'], extra: ['gust', 'waves', 'temp', 'rain'] },
    Wing: { core: ['wind', 'dir'], extra: ['gust', 'waves', 'temp', 'rain'] },
    Surf: { core: ['swell', 'period', 'wind'], extra: ['swellDir', 'dir', 'power', 'temp', 'rain'] },
    /** any other sport, your own ones too */
    Other: { core: ['wind', 'dir'], extra: ['gust', 'waves', 'temp', 'rain'] },
};
export const featuresOf = (sport: string) => SPORT_FEATURES[sport] || SPORT_FEATURES.Other;
export const allFeatures = (sport: string): Feature[] => [...featuresOf(sport).core, ...featuresOf(sport).extra];

const CIRCULAR = new Set<Feature>(['dir', 'swellDir']);
export const isCircular = (f: Feature): boolean => CIRCULAR.has(f);

/** The forecast's values as features (swell falls back to the total waves when there is no swell figure) */
export const toFeatures = (c: Conditions): Features => ({
    wind: c.wind, gust: c.gust, dir: c.dir, waves: c.waves, power: c.power ?? null, temp: c.temp ?? null, rain: c.rain ?? null,
    swell: c.swell ?? c.waves, period: c.swellPeriod ?? c.period ?? null, swellDir: c.swellDir ?? c.wavesDir ?? null,
});

export const has = (x: Features, f: Feature): boolean => typeof x[f] === 'number' && isFinite(x[f] as number);
export const hasCore = (sport: string, x: Features): boolean => featuresOf(sport).core.every(f => has(x, f));

/* ---------- one stretch of hours → one set of values ---------- */

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const circularMean = (deg: number[]) => {
    const r = Math.PI / 180;
    const a = Math.atan2(deg.reduce((s, d) => s + Math.sin(d * r), 0), deg.reduce((s, d) => s + Math.cos(d * r), 0)) / r;
    return (a + 360) % 360;
};
/** How each feature is summed up over a stretch: the strongest gust and the wettest hour, directions averaged round the compass, the rest the median */
const SUMMARY: Partial<Record<Feature, (v: number[]) => number>> = { gust: v => Math.max(...v), rain: v => Math.max(...v), dir: circularMean, swellDir: circularMean };

export const summarize = (hours: Features[]): Features => {
    const out: Features = {};
    for (const f of Object.keys(SCALE) as Feature[]) {
        const v = hours.map(h => h[f]).filter((x): x is number => typeof x === 'number' && isFinite(x));
        out[f] = v.length ? (SUMMARY[f] || median)(v) : null;
    }
    return out;
};

/* ---------- how far apart two forecasts are ---------- */

/** Difference in one feature: the shortest way round the compass for directions */
export const diff = (f: Feature, a: number, b: number): number => (isCircular(f) ? Math.abs((((a - b) % 360) + 540) % 360 - 180) : Math.abs(a - b));

/**
 * Squared distance between two forecasts for a sport, over its fixed feature set:
 * each difference in units of SCALE; a missing extra feature counts as 1 (so missing data never looks closer).
 * null when a core feature is missing on either side (they can't be compared).
 */
export const distance2 = (sport: string, a: Features, b: Features): number | null => {
    const { core, extra } = featuresOf(sport);
    let sum = 0;
    let weights = 0;
    for (const f of [...core, ...extra]) {
        const w = core.includes(f) ? SIMILAR.coreWeight : SIMILAR.optionalWeight;
        const both = has(a, f) && has(b, f);
        if (!both && core.includes(f)) {return null;}
        const d = both ? diff(f, a[f] as number, b[f] as number) / SCALE[f] : 1;
        sum += w * d * d;
        weights += w;
    }
    return sum / weights;
};
