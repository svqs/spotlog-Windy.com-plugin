import type { Dir8, Spot, Session, Snapshot } from './types';
import { THEME } from './theme';

export const DIRS: Dir8[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const SPORTS = ['Surf', 'Windsurf', 'Kite', 'Wing', 'SUP', 'Other'];

/** Degrees (wind FROM) to one of 16 compass names */
export const dirName = (deg: number | null): string => {
    if (deg === null) {
        return '–';
    }
    const names = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return names[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
};

/** Is the wind direction inside one of the spot's 8 sectors (±22.5°)? */
export const dirMatches = (deg: number, dirs: Dir8[]): boolean => {
    if (!dirs.length) {
        return true;
    }
    return dirs.some(d => {
        const center = DIRS.indexOf(d) * 45;
        const diff = Math.abs((((deg - center) % 360) + 540) % 360 - 180);
        return diff <= 22.5;
    });
};

/** Windy-like colours for wind in m/s */
export const windColor = (ms: number | null): string => {
    if (ms === null) {
        return `var(--sl-windNone, ${THEME.windNone})`;
    }
    const limits = [2, 4, 6, 8, 11, 14, 17, 22];
    let i = limits.findIndex(l => ms < l);
    if (i < 0) i = 8;
    const key = `wind${i + 1}` as keyof typeof THEME;
    return `var(--sl-${key}, ${THEME[key]})`;
};

export const round1 = (v: number | null): string => (v === null ? '–' : (Math.round(v * 10) / 10).toString());
export const round0 = (v: number | null): string => (v === null ? '–' : Math.round(v).toString());

export const dirsLabel = (dirs: Dir8[]): string => {
    if (!dirs.length) {
        return 'any direction';
    }
    if (dirs.length === 8) {
        return 'any direction';
    }
    // Group neighbouring sectors (the compass wraps around) into runs like "E–SE"
    const on = DIRS.map(d => dirs.includes(d));
    const startAt = on.findIndex((v, i) => v && !on[(i + 7) % 8]);
    const runs: string[] = [];
    for (let k = 0; k < 8; k++) {
        const i = (startAt + k) % 8;
        if (on[i] && !on[(i + 7) % 8]) {
            let j = i;
            while (on[(j + 1) % 8] && (j + 1) % 8 !== i) j = (j + 1) % 8;
            runs.push(i === j ? DIRS[i] : `${DIRS[i]}–${DIRS[j]}`);
        }
    }
    return runs.join(', ');
};

export const RATINGS = ['flat', 'meh', 'good', 'great', 'epic'];
/** Rating colours 1–5, from the theme (src/lib/theme.ts, designed in the Style Lab) */
// as CSS variables, so a design change shows everywhere at once
export const RATING_BG = [1, 2, 3, 4, 5].map(i => `var(--sl-r${i}bg, ${(THEME as Record<string, unknown>)[`r${i}bg`]})`);
export const RATING_FG = [1, 2, 3, 4, 5].map(i => `var(--sl-r${i}fg, ${(THEME as Record<string, unknown>)[`r${i}fg`]})`);
export const ratingBg = (r: number): string => RATING_BG[Math.max(0, Math.min(4, Math.round(r) - 1))];
export const ratingFg = (r: number): string => RATING_FG[Math.max(0, Math.min(4, Math.round(r) - 1))];
export const GEAR_SPORTS = ['Windsurf', 'Surf', 'Kite', 'Wing'];
/** What you can save per sport, with an example name for the input */
export const GEAR_BY_SPORT: Record<string, { kind: string; hint: string }[]> = {
    Windsurf: [
        { kind: 'Board', hint: 'e.g. Freewave 105 L' }, { kind: 'Sail', hint: 'e.g. 5.3 m² wave' }, { kind: 'Mast', hint: 'e.g. 400 RDM 100%' },
        { kind: 'Boom', hint: 'e.g. 150–200 carbon' }, { kind: 'Fin', hint: 'e.g. 22 cm wave' }, { kind: 'Harness', hint: 'e.g. waist, 28" lines' },
        { kind: 'Wetsuit', hint: 'e.g. 4/3 steamer' }, { kind: 'Other', hint: 'e.g. impact vest' },
    ],
    Surf: [
        { kind: 'Board', hint: "e.g. 6'2 shortboard" }, { kind: 'Fins', hint: 'e.g. thruster FCS II M' }, { kind: 'Leash', hint: "e.g. 6' comp" },
        { kind: 'Wetsuit', hint: 'e.g. 3/2 fullsuit' }, { kind: 'Other', hint: 'e.g. booties, wax' },
    ],
    Kite: [
        { kind: 'Kite', hint: 'e.g. 9 m freeride' }, { kind: 'Board', hint: 'e.g. twintip 138' }, { kind: 'Bar', hint: 'e.g. 24 m lines' },
        { kind: 'Harness', hint: 'e.g. waist, size M' }, { kind: 'Foil', hint: 'e.g. 1000 cm² front wing' }, { kind: 'Wetsuit', hint: 'e.g. 4/3 steamer' },
        { kind: 'Other', hint: 'e.g. helmet' },
    ],
    Wing: [
        { kind: 'Wing', hint: 'e.g. 5 m' }, { kind: 'Board', hint: 'e.g. 95 L' }, { kind: 'Foil', hint: 'e.g. 1500 cm² front wing' },
        { kind: 'Mast', hint: 'e.g. 85 cm aluminium' }, { kind: 'Leash', hint: 'e.g. waist + wrist' }, { kind: 'Wetsuit', hint: 'e.g. 4/3 steamer' },
        { kind: 'Other', hint: 'e.g. impact vest' },
    ],
};
/** kept for older data */
export const GEAR_KINDS = ['Board', 'Sail', 'Fin', 'Wetsuit', 'Wing', 'Kite', 'Other'];

export const MODEL_LABEL: Record<string, string> = {
    ecmwf: 'ECMWF', gfs: 'GFS', icon: 'ICON', iconEu: 'ICON-EU', arome: 'AROME',
    iconD2: 'ICON-D2', ukv: 'UKV', mblue: 'mBlue', namConus: 'NAM',
};
export const modelLabel = (m: string): string => MODEL_LABEL[m] || m.toUpperCase();

/** Distance in km (haversine) */
export const distanceKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number => {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
};

export interface ModelScore {
    model: string;
    miss: number;
    count: number;
}

/**
 * The reality check: for every session with a "felt like" value and a saved snapshot,
 * how far off was each model on average?
 */
export const modelScores = (spot: Spot, sessions: Session[], snapshots: Snapshot[]): ModelScore[] => {
    const acc: Record<string, { sum: number; count: number }> = {};
    sessions
        .filter(s => s.spotId === spot.id && s.felt !== null && s.snapshotId)
        .forEach(s => {
            const snap = snapshots.find(x => x.id === s.snapshotId);
            snap?.models.forEach(m => {
                if (m.wind === null || s.felt === null) {
                    return;
                }
                acc[m.model] = acc[m.model] || { sum: 0, count: 0 };
                acc[m.model].sum += Math.abs(m.wind - s.felt);
                acc[m.model].count += 1;
            });
        });
    return Object.entries(acc)
        .map(([model, v]) => ({ model, miss: v.sum / v.count, count: v.count }))
        .sort((a, b) => a.miss - b.miss);
};

/** Average of felt minus forecast (primary model) — negative means it usually feels lighter */
export const forecastBias = (spot: Spot, sessions: Session[], snapshots: Snapshot[]): number | null => {
    const diffs: number[] = [];
    sessions
        .filter(s => s.spotId === spot.id && s.felt !== null && s.snapshotId)
        .forEach(s => {
            const snap = snapshots.find(x => x.id === s.snapshotId);
            const primary = snap?.models.find(m => m.model === snap.primary) || snap?.models[0];
            if (primary && primary.wind !== null && s.felt !== null) {
                diffs.push(s.felt - primary.wind);
            }
        });
    return diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;
};

export const fmtDay = (ts: number): string =>
    new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (ts: number): string =>
    new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
export const fmtDayTime = (ts: number): string => `${fmtDay(ts)}, ${fmtTime(ts)}`;
