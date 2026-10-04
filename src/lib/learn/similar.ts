/**
 * The default model: weighted similar sessions. For a forecast, find the past outings whose forecasts were
 * most alike, average their ratings (closer = more weight), blend in your own ranges as a starting preference,
 * and only show a tag when there is enough evidence for it.
 */
import { GATES, LEVELS, PRIOR, SIMILAR } from './config';
import { distance2, hasCore, type Features } from './features';
import { userFit, type Prior } from './ranges';
import type { Example } from './examples';

/** What the evidence lets a forecast be called, and why not more */
export type Reason = 'missing forecast' | 'no evidence' | 'few sessions' | 'only poor sessions' | 'below good' | 'outside coverage';

export interface Similar {
    /** 1–5 (not a probability); null when there is nothing to go on */
    score: number | null;
    /** the highest tag the evidence allows: 0 none, 3 good, 4 great, 5 epic */
    cap: number;
    /** learned from similar outings, or only from your own ranges / wind window */
    learned: boolean;
    /** similar local outings, their effective number, and the nearest one's distance */
    support: number;
    nEff: number;
    nearest: number | null;
    reasons: Reason[];
}

/** The tag a score earns: 3 good, 4 great, 5 epic, 0 below good */
export const cutoff = (score: number | null): number => (score === null ? 0 : score >= LEVELS.epic ? 5 : score >= LEVELS.great ? 4 : score >= LEVELS.good ? 3 : 0);

interface Neighbour { e: Example; d: number; w: number; local: boolean }

/** The closest examples, weighted: closer counts more; spots next door count a little (and one day at most `dayCap`, when set) */
function neighbours(sport: string, x: Features, local: Example[], nearby: Example[]): Neighbour[] {
    const found = [...local.map(e => ({ e, local: true })), ...nearby.map(e => ({ e, local: false }))]
        .map(n => ({ ...n, d2: distance2(sport, x, n.e.x) }))
        .filter((n): n is typeof n & { d2: number } => n.d2 !== null && n.d2 <= SIMILAR.maxDistance ** 2)
        .sort((a, b) => a.d2 - b.d2)
        .slice(0, SIMILAR.neighbours)
        .map(n => {
            const base = (n.local ? 1 : SIMILAR.nearbyWeight) * (n.e.kind === 'checked' ? SIMILAR.checkedWeight : 1);
            return { e: n.e, local: n.local, d: Math.sqrt(n.d2), w: base * Math.exp(-n.d2 / 2) };
        });
    const scaleDown = (list: Neighbour[], cap: number) => {
        const sum = list.reduce((a, n) => a + n.w, 0);
        if (sum > cap) {list.forEach(n => (n.w *= cap / sum));}
    };
    if (SIMILAR.dayCap !== null) {
        const days = new Map<string, Neighbour[]>();
        found.forEach(n => { const k = `${n.e.spotId}|${n.e.day}`; days.set(k, [...(days.get(k) || []), n]); });
        days.forEach(list => scaleDown(list, SIMILAR.dayCap as number));
    }
    scaleDown(found.filter(n => !n.local), SIMILAR.nearbyCap);
    return found;
}

/** Similar sessions + your ranges → a score and what the evidence allows */
export function similar(sport: string, x: Features, local: Example[], nearby: Example[], prior: Prior): Similar {
    if (!hasCore(sport, x)) {return { score: null, cap: 0, learned: false, support: 0, nEff: 0, nearest: null, reasons: ['missing forecast'] };}
    const ns = neighbours(sport, x, local, nearby);
    const fit = userFit(prior, x);
    const pw = fit === null ? 0 : prior.weight;
    const sumW = ns.reduce((a, n) => a + n.w, 0);
    const score = sumW + pw ? (ns.reduce((a, n) => a + n.w * n.e.rating, 0) + pw * (1 + PRIOR.span * (fit ?? 0))) / (sumW + pw) : null;

    // the evidence: actual outings at this spot only (not spots next door, not "didn't go" days)
    const outs = ns.filter(n => n.local && n.e.kind === 'outing');
    // effective support: each logged outing is its own piece of evidence (closer ones weigh more)
    const ws = outs.reduce((a, n) => a + n.w, 0);
    const nEff = ws ? ws ** 2 / outs.reduce((a, n) => a + n.w ** 2, 0) : 0;
    const nearest = outs.length ? Math.min(...outs.map(n => n.d)) : null;
    const top = outs.filter(n => n.e.rating >= 4).length;
    const learned = nEff >= GATES.goodSupport && outs.some(n => n.e.rating >= 3) && (nearest ?? Infinity) <= SIMILAR.closeDistance;
    const fromYou = pw > 0;
    const poorOnly = outs.length > 0 && outs.every(n => n.e.rating <= 2);
    let cap = poorOnly ? 0 : learned ? 5 : fromYou ? 3 : 0;
    if (top < GATES.greatTop) {cap = Math.min(cap, 3);}
    if (top < GATES.epicTop || outs.filter(n => n.e.rating === 5).length < GATES.epicFives) {cap = Math.min(cap, 4);}

    const reasons: Reason[] = [];
    if (score === null) {reasons.push('no evidence');}
    else if (poorOnly) {reasons.push('only poor sessions');}
    else if (!cap) {reasons.push('few sessions');}
    else if (!cutoff(score)) {reasons.push('below good');}
    return { score, cap, learned, support: outs.length, nEff, nearest, reasons };
}
