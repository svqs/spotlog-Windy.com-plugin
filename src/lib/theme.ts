/**
 * Spotlog's look: every colour, shape and map mark in one place.
 * The keys match the Style Lab (design page) one to one. A design saved there is applied through design.ts,
 * on top of these defaults. Defaults: Sophia's Style Lab design of 1 Oct 2026, 12:22.
 */
import { DESIGN } from './design';

export const THEME = {
    // session ratings 1–5 (flat, meh, good, great, epic): lists, calendar, rating buttons, tags
    r1bg: '#4d4d4d', r1fg: '#ffffff',
    r2bg: '#375467', r2fg: '#ffffff',
    r3bg: '#3c79cd', r3fg: '#ffffff',
    r4bg: '#50b450', r4fg: '#ffffff',
    r5bg: '#198546', r5fg: '#ffffff',
    // rating guesses (Probably flat … Likely epic); with guessLinked they use the rating colours
    guessLinked: true,
    g1bg: '#c9474f', g1fg: '#ffffff', g2bg: '#6b6b6b', g2fg: '#ffffff', g3bg: '#4fae68', g3fg: '#ffffff', g4bg: '#34985a', g4fg: '#ffffff', g5bg: '#1f8249', g5fg: '#ffffff',
    /** a spot lights up from this guess level (3 = Likely good) */
    lightFrom: 3,
    // spot labels, zoomed in: not selected
    pinBg: '#2e2e2e', pinText: '#f8f8f8', pinDot: '#5a5a5a',
    /** how a good spot lights up: whole label, dot only, or an outline */
    goodStyle: 'pin' as 'pin' | 'dot' | 'outline',
    goodWord: true,
    // spot labels, zoomed in: selected (the dot takes the guess colour when it looks good)
    activeBg: '#ffffff', activeText: '#1c1c1c', activeDot: '#2e2e2e',
    // zoomed out: plain dots
    compactBelow: 7, compactSize: 18, compactDot: '#2e2e2e', compactRing: false, compactRingColor: '#3c3c3c', compactRingWidth: 2,
    // sessions on the map
    sessStyle: 'glow' as 'glow' | 'dot' | 'ring' | 'off',
    sessColor: '#0081fa', sessCore: true, sessCoreRing: '#0081fa',
    sessSize: 25, sessGrow: 1, sessAlpha: 0.35, sessAlphaGrow: 0.08,
    tipBg: '#2e2e2e', tipText: '#f8f8f8',
    // GPS route
    routeColor: '#ff3d8b', routeWidth: 2, casingColor: '#1c1c1c', casingWidth: 1.5, casingAlpha: 0.15,
    startFill: '#ff3d8b', startBorder: '#f8f8f8', endFill: '#1c1c1c', endBorder: '#ff3d8b', routeLabel: '#f8f8f8',
    // popup from "Show on map"
    popupBg: '#ffffff', popupText: '#1c1c1c',
    // panel and actions
    accent: '#d49500', primaryBg: '#d49500', primaryText: '#ffffff', dangerText: '#ff9a9a',
    selBg: '#f8f8f8', selText: '#1c1c1c', switchOn: '#d49500',
    toastBg: '#f8f8f8', toastText: '#1c1c1c', undoBg: '#1c1c1c', matchBg: '#34985a',
    uGround: '#2e2e2e', uCard: '#3c3c3c', uLine: '#4d4d4d', uText: '#f8f8f8', uSub: '#b0b0b0',
    // more of the panel
    uOutline: '#5a5a5a', uInk: '#1c1c1c', uQuiet: '#7a7a7a', uHoverBg: '#424242', uHoverLine: '#777777', star: '#d49500',
    // big action buttons (Save forecast, Add spot, Log session)
    actBg: '#3c3c3c', actLine: '#5a5a5a', actText: '#f8f8f8', actSub: '#b0b0b0', actIcon: '#f8f8f8',
    // other buttons
    ghostLine: '#5a5a5a', ghostText: '#f8f8f8', linkText: '#d49500', dangerLine: '#6a4444', deleteBg: '#c9474f', deleteText: '#ffffff',
    // tabs, switches between options, chips, fields
    tabsBg: '#3c3c3c', tabText: '#d0d0d0', chipLine: '#5a5a5a', chipText: '#f8f8f8', chipOnBg: '#f8f8f8', chipOnText: '#1c1c1c',
    inputBg: '#3c3c3c', inputLine: '#5a5a5a', inputText: '#f8f8f8', switchOff: '#5a5a5a', switchKnob: '#f8f8f8',
    tileBg: '#3c3c3c', tileLine: '#4d4d4d', ghostTagLine: '#5a5a5a', matchText: '#ffffff',
    // light cards (the forecast card, "No forecast attached", suggestions)
    lightBg: '#f8f8f8', lightText: '#1c1c1c', lightSub: '#6b6b6b', lightLine: '#e5e5e5',
    dirTile: '#e9e8e3', wavesTile: '#dbe6f2', modelBg: '#d49500', modelText: '#ffffff', bestBg: '#1c1c1c', bestText: '#f8f8f8',
    // card on the map: small buttons
    popupSub: '#6b6b6b', popupBtnBg: '#ececea', popupBtnText: '#1c1c1c',
    // "It felt like" ruler and the time wheels
    feltMarker: '#d49500', feltTick: '#6b6b6b', feltMajor: '#9a9a9a', feltForecast: '#f8f8f8', feltLabel: '#b0b0b0',
    wheelBg: '#3c3c3c', wheelLine: '#5a5a5a', wheelText: '#f8f8f8', wheelQuiet: '#b0b0b0', calToday: '#d49500',
    // the colours behind wind numbers, calm to storm (m/s: under 2, 4, 6, 8, 11, 14, 17, 22, above)
    wind1: '#5b6ec2', wind2: '#3fa0a8', wind3: '#4dbb5f', wind4: '#8fc446', wind5: '#d4c43a', wind6: '#e0a63a', wind7: '#e0873a', wind8: '#c9474f', wind9: '#a23fa0', windNone: '#e9e8e3',
    windText: '#1c1c1c',
    // shapes and type (px)
    radiusCard: 18, radiusButton: 12, radiusChip: 18, radiusSmall: 9, textSize: 14, titleSize: 17, wordmarkSize: 24, panelGap: 16,
};
/** Spotlog's own look, before a saved design: the Style Lab's "start again" */
export const THEME_DEFAULTS: Readonly<typeof THEME> = { ...THEME };
// the saved design (only what differs) goes on top
for (const [k, v] of Object.entries(DESIGN.tokens)) if (k in THEME && typeof v === typeof (THEME as Record<string, unknown>)[k]) (THEME as Record<string, unknown>)[k] = v;
/** settings that are sizes in px */
const PX = new Set(['compactSize', 'radiusCard', 'radiusButton', 'radiusChip', 'radiusSmall', 'textSize', 'titleSize', 'wordmarkSize', 'panelGap']);
export type Theme = typeof THEME;

/** Guess level 1–5 for a predicted rating (same steps as predictionLabel) */
export const guessLevel = (r: number): number => (r >= 4.2 ? 5 : r >= 3.5 ? 4 : r >= 2.7 ? 3 : r >= 1.9 ? 2 : 1);
const pairOf = (kind: 'r' | 'g', level: number): [string, string] => {
    const t = THEME as unknown as Record<string, string>;
    return [t[`${kind}${level}bg`], t[`${kind}${level}fg`]];
};
/** Fill + text colour of a rating guess (as CSS variables, so a design change shows everywhere at once) */
export const guessColours = (r: number): [string, string] => {
    const k = THEME.guessLinked ? 'r' : 'g';
    const l = guessLevel(r);
    const [b, f] = pairOf(k, l);
    return [`var(--sl-${k}${l}bg, ${b})`, `var(--sl-${k}${l}fg, ${f})`];
};
/** A spot lights up on the map when its guess reaches the chosen level */
export const lightsUp = (r: number | null): boolean => r !== null && guessLevel(r) >= THEME.lightFrom;

const hexA = (hex: string, a: number): string => {
    const n = parseInt(hex.replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;
};
/** Inline style for a session mark with n sessions at one place */
export const sessionMarkStyle = (n: number): { size: number; css: string } | null => {
    const t = THEME;
    if (t.sessStyle === 'off') return null;
    const size = t.sessSize + Math.min(n, 15) * t.sessGrow;
    const a = Math.min(0.95, t.sessAlpha + n * t.sessAlphaGrow);
    if (t.sessStyle === 'dot') {
        const s = Math.max(6, size * 0.45);
        return { size: s, css: `width:${s}px;height:${s}px;background:${hexA(t.sessColor, a)};` };
    }
    if (t.sessStyle === 'ring') {
        const s = Math.max(8, size * 0.6);
        return { size: s, css: `width:${s}px;height:${s}px;border:2.5px solid ${hexA(t.sessColor, a)};box-sizing:border-box;` };
    }
    return { size, css: `width:${size}px;height:${size}px;background:radial-gradient(circle, ${hexA(t.sessColor, a)} 0%, ${hexA(t.sessColor, a * 0.6)} 35%, ${hexA(t.sessColor, 0)} 70%);` };
};

/** CSS variables for the panel and the map marks (the map marks live outside the panel, so they go on :root) */
export const themeCss = (): string => {
    const t = THEME;
    const v: Record<string, string | number> = {
        ground: t.uGround, card: t.uCard, line: t.uLine, text: t.uText, sub: t.uSub,
        accent: t.accent, 'primary-bg': t.primaryBg, 'primary-text': t.primaryText, danger: t.dangerText,
        'sel-bg': t.selBg, 'sel-text': t.selText, switch: t.switchOn, 'toast-bg': t.toastBg, 'toast-text': t.toastText, undo: t.undoBg, match: t.matchBg,
        'pin-bg': t.pinBg, 'pin-text': t.pinText, 'pin-dot': t.pinDot, 'active-bg': t.activeBg, 'active-text': t.activeText, 'active-dot': t.activeDot,
        'compact-size': `${t.compactSize}px`, 'compact-dot': t.compactDot,
        'compact-ring': t.compactRing ? `0 0 0 ${t.compactRingWidth}px ${t.compactRingColor}` : 'none',
        'sess-color': t.sessColor, 'sess-core-ring': t.sessCoreRing, 'tip-bg': t.tipBg, 'tip-text': t.tipText,
        'start-fill': t.startFill, 'start-border': t.startBorder, 'end-fill': t.endFill, 'end-border': t.endBorder, 'route-label': t.routeLabel,
        'popup-bg': t.popupBg, 'popup-text': t.popupText,
    };
    // every setting also has its own variable, named like the setting (--sl-uOutline, --sl-radiusCard…)
    for (const [k, x] of Object.entries(t)) if (typeof x === 'string' || typeof x === 'number') v[k] = typeof x === 'number' && PX.has(k) ? `${x}px` : x;
    return `:root{${Object.entries(v).map(([k, x]) => `--sl-${k}:${x}`).join(';')}}`;
};
export const THEME_CSS = themeCss();
