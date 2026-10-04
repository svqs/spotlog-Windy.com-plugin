import * as wfetch from '@windy/fetch';
import { takeTideSnapshot, isPremium } from './tides/tides';
import { highsAndLows } from './tides/tideCore';
import type { TideSnapshotResult } from './tides/tides';

import type { ModelValue, WaveValue, DaySeries } from './types';
import type { Hour } from './predict';

/** The models you can pick to save (Settings); "Save every model" also adds the regional ones that cover the spot */
export const SNAPSHOT_MODELS = ['ecmwf', 'gfs', 'icon', 'iconEu', 'arome'];
export const WAVE_MODELS = ['ecmwfWaves', 'gfsWaves'];

/** Global point-forecast models, and regional high-resolution ones with the area they cover ([lat min, lat max, lon min, lon max]) */
const GLOBAL_MODELS = ['ecmwf', 'gfs', 'icon', 'mblue'];
const REGIONAL: [string, [number, number, number, number]][] = [
    ['iconEu', [29, 71, -24, 46]], ['arome', [37.5, 55.4, -12, 16]], ['iconD2', [43.2, 58.1, -3.9, 20.3]], ['ukv', [47.5, 61.5, -12.5, 4.5]],
    ['czeAladin', [45.5, 53.5, 6.5, 24.5]], ['hrrrConus', [21, 53, -135, -60]], ['canHrdps', [38, 75, -150, -50]], ['jmaMsm', [20, 48, 118, 150]],
    ['bomAccess', [-45, -9, 110, 156]], ['aromeAntilles', [10, 20, -66, -57]], ['aromeReunion', [-24, -18, 52, 58]], ['namHawaii', [17, 24, -162, -153]],
];
/** Every model worth asking for at a place: the global ones plus the regional ones whose area covers it */
export const modelsFor = (lat: number, lon: number): string[] =>
    [...GLOBAL_MODELS, ...REGIONAL.filter(([, [a, b, c, d]]) => lat >= a && lat <= b && lon >= c && lon <= d).map(([m]) => m)];
export const ALL_MODELS = [...GLOBAL_MODELS, ...REGIONAL.map(([m]) => m)];

const HOUR = 3600e3;
const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null);

const nearestIndex = (tsList: number[], ts: number): number => {
    let best = 0;
    for (let i = 1; i < tsList.length; i++) {
        if (Math.abs(tsList[i] - ts) < Math.abs(tsList[best] - ts)) {best = i;}
    }
    return best;
};

// Small cache so the home screen, spot page and "show on map" don't refetch the same forecast
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, { at: number; p: Promise<any | null> }>();
const TTL = 20 * 60e3;

/**
 * One point forecast: hourly steps where the model has them, plus (for weather models) Windy's daily summary
 * with its predictability % and the sunrise/sunset of the place.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchPayload = (model: string, lat: number, lon: number): Promise<any | null> => {
    const key = `${model}|${lat.toFixed(3)}|${lon.toFixed(3)}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) {return hit.p;}
    const p = (async () => {
        try {
            const extra = model.endsWith('Waves') ? null : { summary: true, celestial: true };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res: any = await wfetch.getPointForecastData(model as any, { lat, lon, step: 1 }, extra);
            return res?.data?.data ? res.data : null;
        } catch (e) {
            console.info(`[spotlog] ${model} not available here`, e);
            return null;
        }
    })();
    cache.set(key, { at: Date.now(), p });
    return p;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchData = async (model: string, lat: number, lon: number): Promise<any | null> => (await fetchPayload(model, lat, lon))?.data ?? null;

/** Windy's predictability of each day (0–100 %, by the day's midnight), when Windy sends it */
export const predictability = async (lat: number, lon: number, model = 'ecmwf'): Promise<Record<string, number>> => {
    const p = await fetchPayload(model, lat, lon);
    const out: Record<string, number> = {};
    (Array.isArray(p?.summary) ? p.summary : []).forEach((d: { timestamp?: number; predictability?: number }) => {
        if (typeof d?.timestamp === 'number' && typeof d.predictability === 'number') {out[new Date(d.timestamp).toDateString()] = d.predictability;}
    });
    return out;
};

/** Daylight for an hour: Windy's day flag, else sunrise–sunset of the place, else 6:00–21:00 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const daylight = (p: any, i: number, ts: number): boolean => {
    const d = p?.data;
    if (Array.isArray(d?.isDay) && typeof d.isDay[i] === 'number') {return d.isDay[i] > 0;}
    const c = p?.celestial;
    if (c && typeof c.sunriseTs === 'number' && typeof c.sunsetTs === 'number') {
        const shift = Math.round((ts - c.sunriseTs) / 864e5) * 864e5;
        return ts >= c.sunriseTs + shift - 1800e3 && ts <= c.sunsetTs + shift + 1800e3;
    }
    const h = new Date(ts).getHours();
    return h >= 6 && h <= 21;
};

export const modelValueAt = async (model: string, lat: number, lon: number, ts: number): Promise<ModelValue | null> => {
    const d = await fetchData(model, lat, lon);
    if (!d || !Array.isArray(d.ts) || !d.ts.length) {return null;}
    const i = nearestIndex(d.ts, ts);
    if (Math.abs(d.ts[i] - ts) > 3 * 3600e3) {return null;}
    const tempK = num(d.temperature?.[i]);
    return {
        model,
        ts: d.ts[i],
        wind: num(d.wind?.[i]),
        gust: num(d.windGust?.[i]),
        dir: num(d.windDir?.[i]),
        temp: tempK === null ? null : Math.round((tempK - 273.15) * 10) / 10,
        rain: num(d.precipAmount?.[i]),
    };
};

export const waveValueAt = async (lat: number, lon: number, ts: number): Promise<WaveValue | null> => {
    for (const model of WAVE_MODELS) {
        const d = await fetchData(model, lat, lon);
        if (!d || !Array.isArray(d.ts) || !d.ts.length || !Array.isArray(d.waves)) {continue;}
        const i = nearestIndex(d.ts, ts);
        const v: WaveValue = {
            model,
            waves: num(d.waves?.[i]),
            wavesPeriod: num(d.wavesPeriod?.[i]),
            wavesPower: num(d.wavesPower?.[i]),
            wavesDir: num(d.wavesDir?.[i]),
            swell1: num(d.swell1?.[i]),
            swell1Period: num(d.swell1Period?.[i]),
            swell1Dir: num(d.swell1Dir?.[i]),
        };
        if (v.waves !== null) {return v;}
    }
    return null;
};

/** Wind + waves right now at a place (the spot's model, ECMWF by default), for tiles and the spot header */
export const conditionsNow = async (lat: number, lon: number, model = 'ecmwf'): Promise<{ wind: ModelValue | null; waves: WaveValue | null }> => {
    const now = Date.now();
    const [wind, waves] = await Promise.all([modelValueAt(model, lat, lon, now), waveValueAt(lat, lon, now)]);
    return { wind, waves };
};

/**
 * The forecast hour by hour between two times (hourly where the model has it), with waves where the sea has them.
 */
export const hoursBetween = async (lat: number, lon: number, from: number, to: number, model = 'ecmwf'): Promise<Hour[]> => {
    const [p, wp] = await Promise.all([fetchPayload(model, lat, lon), fetchPayload(WAVE_MODELS[0], lat, lon)]);
    const d = p?.data;
    const wd = wp?.data;
    if (!d || !Array.isArray(d.ts)) {return [];}
    const waveTs: number[] = wd && Array.isArray(wd.ts) && Array.isArray(wd.waves) ? wd.ts : [];
    const out: Hour[] = [];
    for (let i = 0; i < d.ts.length; i++) {
        const ts = d.ts[i];
        if (ts < from || ts > to) {continue;}
        const tempK = num(d.temperature?.[i]);
        const h0: Hour = {
            ts, wind: num(d.wind?.[i]), gust: num(d.windGust?.[i]), dir: num(d.windDir?.[i]), waves: null, day: daylight(p, i, ts),
            temp: tempK === null ? null : Math.round((tempK - 273.15) * 10) / 10, rain: num(d.precipAmount?.[i]),
        };
        if (waveTs.length) {
            const j = nearestIndex(waveTs, ts);
            if (Math.abs(waveTs[j] - ts) <= 2 * HOUR) {
                Object.assign(h0, {
                    waves: num(wd.waves[j]), period: num(wd.wavesPeriod?.[j]), wavesDir: num(wd.wavesDir?.[j]), power: num(wd.wavesPower?.[j]),
                    swell: num(wd.swell1?.[j]), swellPeriod: num(wd.swell1Period?.[j]), swellDir: num(wd.swell1Dir?.[j]),
                });
            }
        }
        out.push(h0);
    }
    return out;
};

/** The rest of today */
export const hoursToday = (lat: number, lon: number, model = 'ecmwf'): Promise<Hour[]> => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return hoursBetween(lat, lon, Date.now() - 3 * HOUR, end.getTime(), model);
};

/* ---------- tide (experimental: Windy's own tide forecast, Premium only; see src/lib/tides/) ---------- */

/** High and low tide times (and heights in m, when known) in a stretch of time */
export interface TideDay { highs: number[]; lows: number[]; highsM?: number[]; lowsM?: number[] }
export interface TideResult { day: TideDay | null; needsPremium: boolean }

/** One answer per place for a few minutes: the spot page and Save forecast often ask for the same place */
const tideCache = new Map<string, { at: number; res: Promise<TideSnapshotResult> }>();
const snapshotFor = (lat: number, lon: number): Promise<TideSnapshotResult> => {
    const key = `${lat.toFixed(3)},${lon.toFixed(3)},${isPremium()}`;
    const hit = tideCache.get(key);
    if (hit && Date.now() - hit.at < 10 * 60e3) {return hit.res;}
    const res = takeTideSnapshot(lat, lon);
    tideCache.set(key, { at: Date.now(), res });
    return res;
};

/** High and low tides at a place between two times. Never throws; `needsPremium` when the user has no Windy Premium */
export const tideBetween = async (lat: number, lon: number, from: number, to: number): Promise<TideResult> => {
    const res = await snapshotFor(lat, lon);
    if (res.status === 'premium-required') {return { day: null, needsPremium: true };}
    if (res.status !== 'ok') {return { day: null, needsPremium: false };}
    return { day: highsAndLows(res.snapshot.extremes, from, to), needsPremium: false };
};
/** Today's high and low tides (only those of today) */
export const tideToday = async (lat: number, lon: number): Promise<TideResult> => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const res = await tideBetween(lat, lon, start.getTime(), start.getTime() + 864e5);
    if (!res.day) {return res;}
    const inDay = (t: number) => t >= start.getTime() && t < start.getTime() + 864e5;
    const d = res.day;
    return { ...res, day: { highs: d.highs.filter(inDay), lows: d.lows.filter(inDay) } };
};

/** Collects every model (in parallel) for one place and time */
export const captureModels = async (lat: number, lon: number, ts: number, primary: string, allModels: boolean): Promise<ModelValue[]> => {
    const list = allModels ? Array.from(new Set([primary, ...SNAPSHOT_MODELS])) : [primary];
    const results = await Promise.all(list.map(m => modelValueAt(m, lat, lon, ts)));
    return results.filter((r): r is ModelValue => !!r && r.wind !== null);
};

/** Removes the layers the user chose not to keep */
export const trimWaves = (w: WaveValue | null, layers: string[]): WaveValue | null => {
    if (!w) {return null;}
    const keepWaves = layers.includes('waves');
    const out: WaveValue = { ...w };
    if (!keepWaves) { out.waves = null; out.wavesDir = null; }
    if (!layers.includes('swell1')) { out.swell1 = null; out.swell1Period = null; out.swell1Dir = null; }
    if (!layers.includes('wavesPeriod')) {out.wavesPeriod = null;}
    if (!layers.includes('wavesPower')) {out.wavesPower = null;}
    const any = [out.waves, out.swell1, out.wavesPeriod, out.wavesPower].some(v => v !== null);
    return any ? out : null;
};

/* ------------------------------------------------------------------ */
/* Whole-day snapshots                                                  */
/* ------------------------------------------------------------------ */

/** What a snapshot keeps: from the hour it is taken, the next 24 hours */
export const dayWindow = (ts: number): [number, number] => {
    const a = new Date(ts);
    a.setMinutes(0, 0, 0);
    return [a.getTime(), a.getTime() + 24 * 3600e3];
};

/** Does the saved day cover this time (with an hour of slack at the ends)? */
export const covers = (series: DaySeries | undefined | null, ts: number): boolean =>
    !!series && series.ts.length > 0 && ts >= series.ts[0] - HOUR && ts <= series.ts[series.ts.length - 1] + HOUR;

/** Values of every saved model (and the waves) at one time of the saved day */
export const seriesAt = (series: DaySeries, ts: number): { models: ModelValue[]; waves: WaveValue | null } => {
    const i = nearestIndex(series.ts, ts);
    const t = series.ts[i];
    const models: ModelValue[] = Object.entries(series.models)
        .map(([model, v]) => ({ model, ts: t, wind: v.wind[i] ?? null, gust: v.gust[i] ?? null, dir: v.dir[i] ?? null, temp: v.temp[i] ?? null, rain: v.rain?.[i] ?? null }))
        .filter(m => m.wind !== null);
    const w = series.waves;
    const waves: WaveValue | null = w
        ? {
            model: w.model, waves: w.waves[i] ?? null, wavesPeriod: w.wavesPeriod[i] ?? null, wavesPower: w.wavesPower[i] ?? null,
            wavesDir: w.wavesDir[i] ?? null, swell1: w.swell1[i] ?? null, swell1Period: w.swell1Period[i] ?? null, swell1Dir: w.swell1Dir[i] ?? null,
        }
        : null;
    const anyWave = waves && [waves.waves, waves.swell1, waves.wavesPeriod, waves.wavesPower].some(v => v !== null);
    return { models, waves: anyWave ? waves : null };
};

/**
 * Saves the forecast from `focusTs` for the next 24 hours from the chosen models, on an hourly grid.
 * Models with 3-hourly steps fill the nearest hour. Regional models that don't cover the place are skipped.
 * Returns null when Windy has no forecast for that time (past days).
 */
export const captureDay = async (
    lat: number, lon: number, focusTs: number, primary: string, models: string[], layers: string[],
): Promise<{ series: DaySeries; models: ModelValue[]; waves: WaveValue | null; primary: string } | null> => {
    const [from, to] = dayWindow(focusTs);
    const list = Array.from(new Set([primary, ...(models.length ? models : modelsFor(lat, lon))]));
    const datas = await Promise.all(list.map(m => fetchData(m, lat, lon)));
    const grid: number[] = [];
    for (let t = from; t <= to; t += HOUR) {grid.push(t);}
    const pick = (d: any, key: string, t: number): number | null => {
        if (!d || !Array.isArray(d.ts) || !d.ts.length) {return null;}
        const i = nearestIndex(d.ts, t);
        if (Math.abs(d.ts[i] - t) > 1.6 * HOUR) {return null;}
        return num(d[key]?.[i]);
    };
    const keepTemp = layers.includes('temp');
    const out: DaySeries['models'] = {};
    list.forEach((m, k) => {
        const d = datas[k];
        const wind = grid.map(t => pick(d, 'wind', t));
        if (!wind.some(v => v !== null)) {return;}
        out[m] = {
            wind,
            gust: grid.map(t => pick(d, 'windGust', t)),
            dir: grid.map(t => pick(d, 'windDir', t)),
            temp: grid.map(t => {
                const k2 = pick(d, 'temperature', t);
                return keepTemp && k2 !== null ? Math.round((k2 - 273.15) * 10) / 10 : null;
            }),
            rain: grid.map(t => pick(d, 'precipAmount', t)),
        };
    });
    if (!Object.keys(out).length) {return null;}

    let waves: DaySeries['waves'] = null;
    for (const wm of WAVE_MODELS) {
        const d = await fetchData(wm, lat, lon);
        const wv = grid.map(t => pick(d, 'waves', t));
        if (!wv.some(v => v !== null)) {continue;}
        const col = (key: string, layer: string) => grid.map(t => (layers.includes(layer) ? pick(d, key, t) : null));
        waves = {
            model: wm,
            waves: col('waves', 'waves'), wavesDir: col('wavesDir', 'waves'),
            wavesPeriod: col('wavesPeriod', 'wavesPeriod'), wavesPower: col('wavesPower', 'wavesPower'),
            swell1: col('swell1', 'swell1'), swell1Period: col('swell1Period', 'swell1'), swell1Dir: col('swell1Dir', 'swell1'),
        };
        break;
    }
    // the tides around the saved day (a few hours either side, so every hour sits between a high and a low)
    const tide = (await tideBetween(lat, lon, from, to)).day;
    const series: DaySeries = { ts: grid, models: out, waves, ...(tide ? { tide } : {}) };
    const at = seriesAt(series, focusTs);
    return { series, ...at, primary: out[primary] ? primary : Object.keys(out)[0] };
};

/** Which of the snapshot models have a forecast at this place (regional ones don't cover everywhere) */
export const availableModels = async (lat: number, lon: number): Promise<string[]> => {
    const now = Date.now();
    const list = modelsFor(lat, lon);
    const got = await Promise.all(list.map(m => modelValueAt(m, lat, lon, now)));
    return list.filter((_, i) => got[i] && got[i]?.wind !== null);
};
