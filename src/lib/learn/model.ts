/**
 * What spotlog knows about one sport at one spot, and the rating of a forecast for it:
 * weighted similar sessions by default, blended with boosted trees once those have earned it.
 */
import { TREES } from './config';
import { toFeatures, type Conditions, type Features } from './features';
import { describe, type Prior, type RangeRow } from './ranges';
import { cutoff, similar, type Reason } from './similar';
import { treeScore, type TreeModel } from './trees';
import type { Example } from './examples';

export interface SportModel {
    sport: string;
    spotId: string;
    /** examples at this spot (outings and "didn't go" days), and outings at spots next door */
    local: Example[];
    nearby: Example[];
    prior: Prior;
    /** "What works here" */
    rows: RangeRow[];
    /** actual outings that teach, and how many of them were great */
    outings: number;
    great: number;
    /** boosted trees, when they have earned it (set later, they train in the background) */
    trees: TreeModel | null;
}

export function sportModel(spotId: string, sport: string, local: Example[], nearby: Example[], prior: Prior): SportModel {
    const outings = local.filter(e => e.kind === 'outing');
    return { sport, spotId, local, nearby, prior, rows: describe(sport, prior, local), outings: outings.length, great: outings.filter(e => e.rating >= 4).length, trees: null };
}

/** A forecast's rating for a sport, with what it is based on and why it isn't more */
export interface Result {
    sport: string;
    /** 1–5, not a probability; null = nothing to go on */
    score: number | null;
    /** the tag: 3 good, 4 great, 5 epic, 0 not sure yet */
    level: number;
    source: 'user range' | 'similar sessions' | 'boosted trees';
    /** similar local outings, their effective number, the nearest one's distance */
    support: number;
    nEff: number;
    nearest: number | null;
    /** the highest tag the evidence allows (windows use it) */
    cap: number;
    reasons: Reason[];
}

export function rate(m: SportModel, x: Features): Result {
    const s = similar(m.sport, x, m.local, m.nearby, m.prior);
    const base = { sport: m.sport, support: s.support, nEff: s.nEff, nearest: s.nearest, cap: s.cap };
    let score = s.score;
    let source: Result['source'] = s.learned || !s.cap ? 'similar sessions' : 'user range';
    if (m.trees && s.cap) {
        const t = treeScore(m.trees, x);
        if (t === null) {return { ...base, score: null, level: 0, source, cap: 0, reasons: ['outside coverage'] };}
        const share = m.prior.confirmed ? TREES.blendConfirmed : TREES.blend;
        score = s.score === null ? t : share * t + (1 - share) * s.score;
        source = 'boosted trees';
    }
    const level = Math.min(cutoff(score), s.cap);
    return { ...base, score, level, source, reasons: level || s.reasons.length ? s.reasons : ['below good'] };
}

/** The best sport for one forecast (e.g. right now): the highest tag, then the highest score */
export function rateBest(models: SportModel[], c: Conditions | null): Result | null {
    if (!c) {return null;}
    const x = toFeatures(c);
    return models.map(m => rate(m, x)).sort((a, b) => b.level - a.level || (b.score ?? 0) - (a.score ?? 0))[0] || null;
}
