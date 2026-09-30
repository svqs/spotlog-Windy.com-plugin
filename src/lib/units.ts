import type { WindUnit, HeightUnit, TempUnit } from './types';

export const WIND_UNITS: { id: WindUnit; label: string }[] = [
    { id: 'ms', label: 'm/s' },
    { id: 'kt', label: 'kt' },
    { id: 'kmh', label: 'km/h' },
    { id: 'mph', label: 'mph' },
    { id: 'bft', label: 'bft' },
];
export const HEIGHT_UNITS: { id: HeightUnit; label: string }[] = [
    { id: 'm', label: 'm' },
    { id: 'ft', label: 'ft' },
];
export const TEMP_UNITS: { id: TempUnit; label: string }[] = [
    { id: 'C', label: '°C' },
    { id: 'F', label: '°F' },
];

// Beaufort upper limits in m/s for force 0..11 (12 is above the last limit)
const BFT = [0.5, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];

export const windLabel = (u: WindUnit): string => WIND_UNITS.find(x => x.id === u)?.label || u;

/** m/s -> display unit (not rounded) */
export const toWind = (ms: number, u: WindUnit): number => {
    switch (u) {
        case 'kt': return ms * 1.943844;
        case 'kmh': return ms * 3.6;
        case 'mph': return ms * 2.236936;
        case 'bft': {
            const i = BFT.findIndex(limit => ms < limit);
            return i === -1 ? 12 : i;
        }
        default: return ms;
    }
};

/** display unit -> m/s */
export const fromWind = (v: number, u: WindUnit): number => {
    switch (u) {
        case 'kt': return v / 1.943844;
        case 'kmh': return v / 3.6;
        case 'mph': return v / 2.236936;
        case 'bft': {
            const f = Math.max(0, Math.min(12, Math.round(v)));
            const lo = f === 0 ? 0 : BFT[f - 1];
            const hi = f >= 12 ? 36 : BFT[f];
            return (lo + hi) / 2;
        }
        default: return v;
    }
};

/** Rounded wind in the display unit, as a number (0 decimals, 1 for m/s under 10) */
export const windNum = (ms: number | null, u: WindUnit): number | null => {
    if (ms === null || ms === undefined || !isFinite(ms)) return null;
    const v = toWind(ms, u);
    return u === 'ms' ? Math.round(v * 10) / 10 : Math.round(v);
};
export const fmtWind = (ms: number | null, u: WindUnit, withUnit = false): string => {
    const n = windNum(ms, u);
    if (n === null) return '–';
    return withUnit ? `${n} ${windLabel(u)}` : `${n}`;
};
/** For big tiles: whole numbers only */
export const fmtWind0 = (ms: number | null, u: WindUnit): string => {
    if (ms === null || !isFinite(ms)) return '–';
    return `${Math.round(toWind(ms, u))}`;
};

export const fmtHeight = (m: number | null, u: HeightUnit, withUnit = false): string => {
    if (m === null || !isFinite(m)) return '–';
    const v = u === 'ft' ? Math.round(m * 3.28084 * 10) / 10 : Math.round(m * 10) / 10;
    return withUnit ? `${v} ${u}` : `${v}`;
};

export const fmtTemp = (c: number | null, u: TempUnit): string => {
    if (c === null || !isFinite(c)) return '–';
    return u === 'F' ? `${Math.round(c * 9 / 5 + 32)} °F` : `${Math.round(c)} °C`;
};

export const fmtDistance = (km: number, h: HeightUnit): string =>
    h === 'ft' ? `${(km * 0.621371).toFixed(1)} mi` : `${km.toFixed(1)} km`;

/** Steps for the range steppers, in display unit */
export const windStep = (u: WindUnit): number => (u === 'kmh' ? 2 : 1);

/** Uses Windy's own wind unit as the first default, if Windy exposes it */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const guessWindUnit = (metrics: any): WindUnit => {
    try {
        const m = String(metrics?.wind?.metric || '').toLowerCase();
        if (m.includes('kt')) return 'kt';
        if (m.includes('km')) return 'kmh';
        if (m.includes('mph')) return 'mph';
        if (m.includes('bft')) return 'bft';
    } catch {
        /* ignore */
    }
    return 'ms';
};

export const uses12h = (): boolean => {
    try {
        return !!new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12;
    } catch {
        return false;
    }
};

export const fmtClock = (hhmm: string): string => {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    if (!uses12h()) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
};
