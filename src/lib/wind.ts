import { THEME } from './theme';

export { DIRS, dirName, dirsLabel } from './directions';
export { distanceKm } from './geo';
export const SPORTS = ['Surf', 'Windsurf', 'Kite', 'Wing'];

/** Windy-like colours for wind in m/s */
export const windColor = (ms: number | null): string => {
    if (ms === null) {
        return `var(--sl-windNone, ${THEME.windNone})`;
    }
    const limits = [2, 4, 6, 8, 11, 14, 17, 22];
    let i = limits.findIndex(l => ms < l);
    if (i < 0) {i = 8;}
    const key = `wind${i + 1}` as keyof typeof THEME;
    return `var(--sl-${key}, ${THEME[key]})`;
};

/** Rating colours 1–5, from the theme (src/lib/theme.ts, designed in the Style Lab) */
// as CSS variables, so a design change shows everywhere at once
export const RATING_BG = [1, 2, 3, 4, 5].map(i => `var(--sl-r${i}bg, ${(THEME as Record<string, unknown>)[`r${i}bg`]})`);
export const RATING_FG = [1, 2, 3, 4, 5].map(i => `var(--sl-r${i}fg, ${(THEME as Record<string, unknown>)[`r${i}fg`]})`);
export const ratingBg = (r: number): string => RATING_BG[Math.max(0, Math.min(4, Math.round(r) - 1))];
export const ratingFg = (r: number): string => RATING_FG[Math.max(0, Math.min(4, Math.round(r) - 1))];
export const GEAR_SPORTS = ['Windsurf', 'Surf', 'Kite', 'Wing'];
/** What you can save per sport, with an example name for the input */
export const GEAR_BY_SPORT: Record<string, { kind: string; hintKey: string }[]> = {
    Windsurf: [
        { kind: 'Board', hintKey: 'hintWindsurfBoard' }, { kind: 'Sail', hintKey: 'hintWindsurfSail' }, { kind: 'Mast', hintKey: 'hintWindsurfMast' },
        { kind: 'Boom', hintKey: 'hintWindsurfBoom' }, { kind: 'Fin', hintKey: 'hintWindsurfFin' }, { kind: 'Harness', hintKey: 'hintWindsurfHarness' },
        { kind: 'Wetsuit', hintKey: 'hintWindsurfWetsuit' }, { kind: 'Other', hintKey: 'hintWindsurfOther' },
    ],
    Surf: [
        { kind: 'Board', hintKey: 'hintSurfBoard' }, { kind: 'Fins', hintKey: 'hintSurfFins' }, { kind: 'Leash', hintKey: 'hintSurfLeash' },
        { kind: 'Wetsuit', hintKey: 'hintSurfWetsuit' }, { kind: 'Other', hintKey: 'hintSurfOther' },
    ],
    Kite: [
        { kind: 'Kite', hintKey: 'hintKiteKite' }, { kind: 'Board', hintKey: 'hintKiteBoard' }, { kind: 'Bar', hintKey: 'hintKiteBar' },
        { kind: 'Harness', hintKey: 'hintKiteHarness' }, { kind: 'Foil', hintKey: 'hintKiteFoil' }, { kind: 'Wetsuit', hintKey: 'hintKiteWetsuit' },
        { kind: 'Other', hintKey: 'hintKiteOther' },
    ],
    Wing: [
        { kind: 'Wing', hintKey: 'hintWingWing' }, { kind: 'Board', hintKey: 'hintWingBoard' }, { kind: 'Foil', hintKey: 'hintWingFoil' },
        { kind: 'Mast', hintKey: 'hintWingMast' }, { kind: 'Leash', hintKey: 'hintWingLeash' }, { kind: 'Wetsuit', hintKey: 'hintWingWetsuit' },
        { kind: 'Other', hintKey: 'hintWingOther' },
    ],
};

export const MODEL_LABEL: Record<string, string> = {
    ecmwf: 'ECMWF', gfs: 'GFS', icon: 'ICON', iconEu: 'ICON-EU', arome: 'AROME',
    iconD2: 'ICON-D2', ukv: 'UKV', mblue: 'mBlue', namConus: 'NAM',
};
export const modelLabel = (m: string): string => MODEL_LABEL[m] || m.toUpperCase();

export const fmtDay = (ts: number): string =>
    new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (ts: number): string =>
    new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
export const fmtDayTime = (ts: number): string => `${fmtDay(ts)}, ${fmtTime(ts)}`;
