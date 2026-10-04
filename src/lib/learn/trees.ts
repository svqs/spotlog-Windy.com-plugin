/**
 * The larger-data model: small gradient-boosted regression trees on the same forecast features and ratings.
 * Only for a spot and sport with lots of varied outings, and only when a walk-forward check on later outings
 * shows it beats weighted similar sessions. Deterministic (no randomness), pure TypeScript, no library.
 */
import { TREES } from './config';
import { allFeatures, featuresOf, has, isCircular, type Feature, type Features } from './features';
import { cutoff, similar } from './similar';
import type { Example } from './examples';
import type { Prior } from './ranges';

type Node = { leaf: number } | { col: number; at: number; lo: Node; hi: Node };

export interface TreeModel {
    sport: string;
    /** column means for missing values, from the training outings */
    means: number[];
    base: number;
    trees: Node[];
    /** the range of each core number seen in training: outside it the trees don't guess */
    seen: Partial<Record<Feature, [number, number]>>;
    /** walk-forward result that let the trees in */
    check: { heldOut: number; maeTrees: number; maeSimilar: number };
}

/* ---------- features → numbers ---------- */

/** One row of numbers: directions as sine and cosine, an extra feature also says whether it was missing (NaN = fill in later) */
function row(sport: string, x: Features): number[] {
    const { core } = featuresOf(sport);
    return allFeatures(sport).flatMap(f => {
        const v = has(x, f) ? (x[f] as number) : NaN;
        const cols = isCircular(f) ? [Math.sin((v * Math.PI) / 180), Math.cos((v * Math.PI) / 180)] : [v];
        return core.includes(f) ? cols : [...cols, Number.isNaN(v) ? 1 : 0];
    });
}
const fill = (r: number[], means: number[]) => r.map((v, i) => (Number.isNaN(v) ? means[i] : v));
const meansOf = (rows: number[][]) => rows[0].map((_, i) => { const v = rows.map(r => r[i]).filter(x => !Number.isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; });

/* ---------- one regression tree ---------- */

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

/**
 * The split with the lowest squared error that leaves at least minLeaf examples on each side.
 * `order` holds every column's example indexes sorted once (the numbers don't change between trees, only y does).
 */
function grow(X: number[][], y: number[], order: number[][], inNode: boolean[], depth: number): Node {
    const idx = order[0].filter(i => inNode[i]);
    if (depth === 0 || idx.length < 2 * TREES.minLeaf) {return { leaf: mean(idx.map(i => y[i])) };}
    let best: { col: number; at: number; err: number } | null = null;
    for (let c = 0; c < X[0].length; c++) {
        const s = order[c].filter(i => inNode[i]);
        const total = s.reduce((a, i) => a + y[i], 0);
        const total2 = s.reduce((a, i) => a + y[i] ** 2, 0);
        let left = 0;
        let left2 = 0;
        for (let k = 1; k < s.length; k++) {
            left += y[s[k - 1]];
            left2 += y[s[k - 1]] ** 2;
            if (k < TREES.minLeaf || s.length - k < TREES.minLeaf || X[s[k - 1]][c] === X[s[k]][c]) {continue;}
            const err = left2 - left ** 2 / k + (total2 - left2) - (total - left) ** 2 / (s.length - k);
            if (!best || err < best.err - 1e-12) {best = { col: c, at: (X[s[k - 1]][c] + X[s[k]][c]) / 2, err };}
        }
    }
    if (!best) {return { leaf: mean(idx.map(i => y[i])) };}
    const { col, at } = best;
    const side = (lower: boolean) => inNode.map((on, i) => on && (X[i][col] <= at) === lower);
    return { col, at, lo: grow(X, y, order, side(true), depth - 1), hi: grow(X, y, order, side(false), depth - 1) };
}
const walk = (n: Node, r: number[]): number => ('leaf' in n ? n.leaf : walk(r[n.col] <= n.at ? n.lo : n.hi, r));

/* ---------- boosting ---------- */

function* fitSteps(sport: string, train: Example[]): Generator<void, Omit<TreeModel, 'check'>> {
    const raw = train.map(e => row(sport, e.x));
    const means = meansOf(raw);
    const X = raw.map(r => fill(r, means));
    const y = train.map(e => e.rating);
    const base = mean(y);
    const pred = y.map(() => base);
    const trees: Node[] = [];
    const order = X[0].map((_, col) => y.map((_v, i) => i).sort((a, b) => X[a][col] - X[b][col]));
    const all = y.map(() => true);
    for (let t = 0; t < TREES.trees; t++) {
        const tree = grow(X, y.map((v, i) => v - pred[i]), order, all, TREES.depth);
        trees.push(tree);
        X.forEach((r, i) => (pred[i] += TREES.rate * walk(tree, r)));
        yield;
    }
    const seen: TreeModel['seen'] = {};
    for (const f of featuresOf(sport).core.filter(c => !isCircular(c))) {
        const v = train.map(e => e.x[f] as number);
        seen[f] = [Math.min(...v), Math.max(...v)];
    }
    return { sport, means, base, trees, seen };
}

/** The trees' score for a forecast (1–5), or null outside what they were trained on */
export function treeScore(m: TreeModel, x: Features): number | null {
    for (const [f, [lo, hi]] of Object.entries(m.seen) as [Feature, [number, number]][]) {
        if (!has(x, f) || (x[f] as number) < lo || (x[f] as number) > hi) {return null;}
    }
    const r = fill(row(m.sport, x), m.means);
    return Math.min(5, Math.max(1, m.base + TREES.rate * m.trees.reduce((a, t) => a + walk(t, r), 0)));
}

/* ---------- when the trees may be used ---------- */

const outingsOf = (local: Example[]) => local.filter(e => e.kind === 'outing');

/** Enough varied outings at this spot for this sport (spots next door and "didn't go" days don't count) */
export function treesEligible(local: Example[]): boolean {
    const o = outingsOf(local);
    return o.length >= TREES.minOutings && new Set(o.map(e => e.day)).size >= TREES.minDays
        && o.filter(e => e.rating <= 2).length >= TREES.minPoor && o.filter(e => e.rating >= 3).length >= TREES.minOk;
}

/**
 * Walk-forward check: the later days (in up to 5 chronological blocks, a day never split) are predicted from
 * the days before them, by the trees and by similar sessions. The trees win when their mean error is at least
 * 5 % lower on 20+ held-out outings and they don't call more poor outings Good.
 * Returns the trees trained on everything when they win, else null.
 */
function* trainingSteps(sport: string, local: Example[], nearby: Example[], prior: Prior): Generator<void, TreeModel | null> {
    if (!treesEligible(local)) {return null;}
    const days = [...new Set(outingsOf(local).map(e => e.day))].sort();
    const held = days.slice(Math.floor(days.length * 0.6));
    const size = Math.ceil(held.length / 5);
    const errs = { trees: 0, similar: 0, n: 0, goodTrees: 0, goodSimilar: 0 };
    for (let b = 0; b < held.length; b += size) {
        const block = new Set(held.slice(b, b + size));
        const before = local.filter(e => e.day < held[b]);
        const test = outingsOf(local).filter(e => block.has(e.day));
        if (!outingsOf(before).length) {continue;}
        const trees = { ...(yield* fitSteps(sport, outingsOf(before))), check: { heldOut: 0, maeTrees: 0, maeSimilar: 0 } };
        for (const e of test) {
            const s = similar(sport, e.x, before, nearby, prior);
            const t = treeScore(trees, e.x) ?? s.score ?? 3;
            errs.trees += Math.abs(t - e.rating);
            errs.similar += Math.abs((s.score ?? 3) - e.rating);
            errs.n++;
            yield;
            if (e.rating <= 2) {
                errs.goodTrees += Math.min(cutoff(t), s.cap) >= 3 ? 1 : 0;
                errs.goodSimilar += Math.min(cutoff(s.score), s.cap) >= 3 ? 1 : 0;
            }
        }
    }
    if (errs.n < TREES.minHeldOut || errs.trees > (1 - TREES.minGain) * errs.similar || errs.goodTrees > errs.goodSimilar) {return null;}
    return { ...(yield* fitSteps(sport, outingsOf(local))), check: { heldOut: errs.n, maeTrees: errs.trees / errs.n, maeSimilar: errs.similar / errs.n } };
}

/** Synchronous reference and cooperative execution share every arithmetic operation. */
export function trainTrees(sport: string, local: Example[], nearby: Example[], prior: Prior): TreeModel | null {
    const steps = trainingSteps(sport, local, nearby, prior);
    let step = steps.next();
    while (!step.done) {step = steps.next();}
    return step.value;
}

export async function trainTreesAsync(sport: string, local: Example[], nearby: Example[], prior: Prior,
    valid: () => boolean = () => true): Promise<TreeModel | null> {
    const steps = trainingSteps(sport, local, nearby, prior);
    let step = steps.next();
    let deadline = Date.now() + 8;
    while (!step.done) {
        if (!valid()) {steps.return(null); return null;}
        if (Date.now() >= deadline) {
            await new Promise<void>(resolve => setTimeout(resolve, 0));
            deadline = Date.now() + 8;
        }
        step = steps.next();
    }
    return step.value;
}
