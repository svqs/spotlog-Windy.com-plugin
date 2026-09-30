import { getPointForecastData } from '@windy/fetch';

import type { ModelValue, WaveValue, Spot, DaySeries } from './types';
import { dirMatches } from './wind';

/** Global models that exist almost everywhere, plus regional ones that fail gracefully outside their area */
export const SNAPSHOT_MODELS = ['ecmwf', 'gfs', 'icon', 'iconEu', 'arome'];
export const WAVE_MODELS = ['ecmwfWaves', 'gfsWaves'];

const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null);

const nearestIndex = (tsList: number[], ts: number): number => {
    let best = 0;
    for (let i = 1; i < tsList.length; i++) {
        if (Math.abs(tsList[i] - ts) < Math.abs(tsList[best] - ts)) best = i;
    }
    return best;
};

// Small cache so the home screen, spot page and "show on map" don't refetch the same forecast
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, { at: number; p: Promise<any | null> }>();
const TTL = 20 * 60e3;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchData = (model: string, lat: number, lon: number): Promise<any | null> => {
    const key = `${model}|${lat.toFixed(3)}|${lon.toFixed(3)}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return hit.p;
    const p = (async () => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res: any = await getPointForecastData(model as any, { lat, lon });
            return res?.data?.data ?? null;
        } catch (e) {
            console.info(`[spotlog] ${model} not available here`, e);
            return null;
        }
    })();
    cache.set(key, { at: Date.now(), p });
    return p;
};

export const modelValueAt = async (model: string, lat: number, lon: number, ts: number): Promise<ModelValue | null> => {
    const d = await fetchData(model, lat, lon);
    if (!d || !Array.isArray(d.ts) || !d.ts.length) return null;
    const i = nearestIndex(d.ts, ts);
    if (Math.abs(d.ts[i] - ts) > 3 * 3600e3) return null;
    const tempK = num(d.temperature?.[i]);
    return {
        model,
        ts: d.ts[i],
        wind: num(d.wind?.[i]),
        gust: num(d.windGust?.[i]),
        dir: num(d.windDir?.[i]),
        temp: tempK === null ? null : Math.round((tempK - 273.15) * 10) / 10,
    };
};

export const waveValueAt = async (lat: number, lon: number, ts: number): Promise<WaveValue | null> => {
    for (const model of WAVE_MODELS) {
        const d = await fetchData(model, lat, lon);
        if (!d || !Array.isArray(d.ts) || !d.ts.length || !Array.isArray(d.waves)) continue;
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
        if (v.waves !== null) return v;
    }
    return null;
};

/** Wind + waves right now at a place (ECMWF), for tiles and the spot header */
export const conditionsNow = async (lat: number, lon: number): Promise<{ wind: ModelValue | null; waves: WaveValue | null }> => {
    const now = Date.now();
    const [wind, waves] = await Promise.all([modelValueAt('ecmwf', lat, lon, now), waveValueAt(lat, lon, now)]);
    return { wind, waves };
};

/** Collects every model (in parallel) for one place and time */
export const captureModels = async (lat: number, lon: number, ts: number, primary: string, allModels: boolean): Promise<ModelValue[]> => {
    const list = allModels ? Array.from(new Set([primary, ...SNAPSHOT_MODELS])) : [primary];
    const results = await Promise.all(list.map(m => modelValueAt(m, lat, lon, ts)));
    return results.filter((r): r is ModelValue => !!r && r.wind !== null);
};

/** Removes the layers the user chose not to keep */
export const trimWaves = (w: WaveValue | null, layers: string[]): WaveValue | null => {
    if (!w) return null;
    const keepWaves = layers.includes('waves');
    const out: WaveValue = { ...w };
    if (!keepWaves) { out.waves = null; out.wavesDir = null; }
    if (!layers.includes('swell1')) { out.swell1 = null; out.swell1Period = null; out.swell1Dir = null; }
    if (!layers.includes('wavesPeriod')) out.wavesPeriod = null;
    if (!layers.includes('wavesPower')) out.wavesPower = null;
    const any = [out.waves, out.swell1, out.wavesPeriod, out.wavesPower].some(v => v !== null);
    return any ? out : null;
};

export interface MatchWindow {
    start: number;
    end: number;
    avgWind: number;
    dir: number;
}

/** Next window of at least `minHours` of daylight where the forecast fits the spot's directions and strength */
export const nextMatch = async (spot: Spot, model = 'ecmwf', minHours = 2): Promise<MatchWindow | null> => {
    if (spot.windUnknown && !spot.dirs.length) return null;
    const d = await fetchData(model, spot.lat, spot.lon);
    if (!d || !Array.isArray(d.ts)) return null;
    const now = Date.now();
    let run: number[] = [];
    const close = (): MatchWindow | null => {
        if (!run.length) return null;
        const first = run[0];
        const last = run[run.length - 1];
        if ((d.ts[last] - d.ts[first]) / 3600e3 + 1 < minHours) return null;
        const winds = run.map(i => d.wind[i]);
        return {
            start: d.ts[first],
            end: d.ts[last],
            avgWind: winds.reduce((a: number, b: number) => a + b, 0) / winds.length,
            dir: d.windDir[run[Math.floor(run.length / 2)]],
        };
    };
    for (let i = 0; i < d.ts.length; i++) {
        if (d.ts[i] < now) continue;
        const w = num(d.wind?.[i]);
        const dir = num(d.windDir?.[i]);
        const daylight = d.isDay ? !!d.isDay[i] : true;
        const ok = w !== null && dir !== null && daylight && w >= spot.min && w <= spot.max && dirMatches(dir, spot.dirs);
        if (ok) {
            run.push(i);
        } else {
            const found = close();
            if (found) return found;
            run = [];
        }
    }
    return close();
};

/* ------------------------------------------------------------------ */
/* Whole-day snapshots                                                  */
/* ------------------------------------------------------------------ */

/** The part of a day a snapshot keeps: 05:00–22:00 local time */
export const dayWindow = (ts: number): [number, number] => {
    const a = new Date(ts);
    a.setHours(5, 0, 0, 0);
    const b = new Date(ts);
    b.setHours(22, 0, 0, 0);
    return [a.getTime(), b.getTime()];
};

const HOUR = 3600e3;

/** Does the saved day cover this time (with an hour of slack at the ends)? */
export const covers = (series: DaySeries | undefined | null, ts: number): boolean =>
    !!series && series.ts.length > 0 && ts >= series.ts[0] - HOUR && ts <= series.ts[series.ts.length - 1] + HOUR;

/** Values of every saved model (and the waves) at one time of the saved day */
export const seriesAt = (series: DaySeries, ts: number): { models: ModelValue[]; waves: WaveValue | null } => {
    const i = nearestIndex(series.ts, ts);
    const t = series.ts[i];
    const models: ModelValue[] = Object.entries(series.models)
        .map(([model, v]) => ({ model, ts: t, wind: v.wind[i] ?? null, gust: v.gust[i] ?? null, dir: v.dir[i] ?? null, temp: v.temp[i] ?? null }))
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
 * Saves the forecast for the whole day of `focusTs` (05:00–22:00) from every model (or only the
 * active one), on an hourly grid. Models with 3-hourly steps fill the nearest hour.
 * Returns null when Windy has no forecast for that day any more (past days).
 */
export const captureDay = async (
    lat: number, lon: number, focusTs: number, primary: string, allModels: boolean, layers: string[],
): Promise<{ series: DaySeries; models: ModelValue[]; waves: WaveValue | null; primary: string } | null> => {
    const [from, to] = dayWindow(focusTs);
    const list = allModels ? Array.from(new Set([primary, ...SNAPSHOT_MODELS])) : [primary];
    const datas = await Promise.all(list.map(m => fetchData(m, lat, lon)));
    const grid: number[] = [];
    for (let t = from; t <= to; t += HOUR) grid.push(t);
    const pick = (d: any, key: string, t: number): number | null => {
        if (!d || !Array.isArray(d.ts) || !d.ts.length) return null;
        const i = nearestIndex(d.ts, t);
        if (Math.abs(d.ts[i] - t) > 1.6 * HOUR) return null;
        return num(d[key]?.[i]);
    };
    const keepTemp = layers.includes('temp');
    const models: DaySeries['models'] = {};
    list.forEach((m, k) => {
        const d = datas[k];
        const wind = grid.map(t => pick(d, 'wind', t));
        if (!wind.some(v => v !== null)) return;
        models[m] = {
            wind,
            gust: grid.map(t => pick(d, 'windGust', t)),
            dir: grid.map(t => pick(d, 'windDir', t)),
            temp: grid.map(t => {
                const k2 = pick(d, 'temperature', t);
                return keepTemp && k2 !== null ? Math.round((k2 - 273.15) * 10) / 10 : null;
            }),
        };
    });
    if (!Object.keys(models).length) return null;

    let waves: DaySeries['waves'] = null;
    for (const wm of WAVE_MODELS) {
        const d = await fetchData(wm, lat, lon);
        const wv = grid.map(t => pick(d, 'waves', t));
        if (!wv.some(v => v !== null)) continue;
        const col = (key: string, layer: string) => grid.map(t => (layers.includes(layer) ? pick(d, key, t) : null));
        waves = {
            model: wm,
            waves: col('waves', 'waves'), wavesDir: col('wavesDir', 'waves'),
            wavesPeriod: col('wavesPeriod', 'wavesPeriod'), wavesPower: col('wavesPower', 'wavesPower'),
            swell1: col('swell1', 'swell1'), swell1Period: col('swell1Period', 'swell1'), swell1Dir: col('swell1Dir', 'swell1'),
        };
        break;
    }
    const series: DaySeries = { ts: grid, models, waves };
    const at = seriesAt(series, focusTs);
    return { series, ...at, primary: models[primary] ? primary : Object.keys(models)[0] };
};
