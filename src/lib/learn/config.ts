/**
 * Every number the recommendation uses, in one place (docs/learning.md explains each).
 * These are starting values to check against real diaries, not proven constants: change them here only.
 * Bump ALGORITHM_VERSION when a change alters results, so cached models are rebuilt.
 */
import type { Feature } from './features';

export const ALGORITHM_VERSION = 2;

/** What one unit of difference is worth when comparing two forecasts (SI units; directions in degrees) */
export const SCALE: Record<Feature, number> = {
    wind: 3, gust: 3, waves: 0.75, swell: 0.75, period: 3, temp: 8, rain: 2, power: 10, dir: 45, swellDir: 45,
};

/** How far beyond a range you set the fit has dropped to 0 (at least; or 25 % of the edge) */
export const TOLERANCE: Record<Feature, number> = {
    wind: 1.5, gust: 1.5, waves: 0.25, swell: 0.25, period: 2, temp: 5, rain: 1, power: 2, dir: 30, swellDir: 30,
};

/** Which saved forecasts may teach (examples.ts) */
export const EXAMPLE = {
    /** the saved forecast may not have a gap longer than this within the outing (hours) */
    maxGapH: 1.5,
    /** a snapshot not linked to the spot still counts when it was saved this close to it (km) */
    sameSpotKm: 1,
};

/** Weighted similar sessions (similar.ts) */
export const SIMILAR = {
    /** the closest examples used, and how far away they may be (in scaled distance) */
    neighbours: 10,
    maxDistance: 2,
    /** a local outing this close is needed before a learned tag */
    closeDistance: 1,
    /** feature weights in the distance: the sport's core features count double */
    coreWeight: 2,
    optionalWeight: 1,
    /** spots next door: how far, how much each outing counts, and their total cap */
    nearbyKm: 3,
    nearbyWeight: 0.25,
    nearbyCap: 2,
    /** a "Not worth it, didn't go" day counts this much (a preference, not an outing) */
    checkedWeight: 0.25,
    /**
     * all outings of one spot, sport and day together count at most this much; null = off.
     * Off: several sessions on one day can go differently (tide, time of day), so each log is its own evidence.
     */
    dayCap: null as number | null,
};

/** Your own ranges and wind window as a starting preference: priorRating = 1 + span × fit, counted like `weight` sessions */
export const PRIOR = { span: 2.4, weight: 2 };

/** Score cut-offs for the tags, and the evidence each tag needs */
export const LEVELS = { good: 2.7, great: 3.5, epic: 4.2 };
export const GATES = {
    /** effective number of similar local outings for a learned Good */
    goodSupport: 3,
    /** local outings rated 4+ among the similar ones for Great / Epic, and 5s for Epic */
    greatTop: 3,
    epicTop: 6,
    epicFives: 2,
};

/** Upcoming forecast stretches (windows.ts) */
export const WINDOW = {
    /** shortest stretch worth recommending (hours): 1 = every good hour counts, for the finest times */
    hours: 1,
    /** stretches whose mean ratings differ by at most this are a tie: the longer, then the earlier wins */
    tie: 0.2,
};

/**
 * Which forecast to trust here (skill.ts): a model is ranked once it was checked on `minSessions` outings.
 * The best one becomes the spot's learning model once it was checked on `switchAfter` outings and beats the
 * current one by at least `switchMargin` rating points.
 */
export const TRUST = { minSessions: 3, switchAfter: 10, switchMargin: 0.1 };

/** "What works here" ranges (ranges.ts) */
export const RANGES = { minGood: 3, low: 0.1, high: 0.9, goodFrom: 4, poorTo: 2 };

/** Boosted trees (trees.ts): when they may be used, how they are built and when they win */
export const TREES = {
    minOutings: 100,
    minDays: 30,
    minPoor: 20,
    minOk: 20,
    depth: 2,
    minLeaf: 10,
    rate: 0.05,
    trees: 100,
    /** walk-forward check: held-out outings needed, and how much better the trees must be */
    minHeldOut: 20,
    minGain: 0.05,
    /** share of the trees in the final score (when you have your own ranges or a wind window) */
    blend: 0.7,
    blendWithRanges: 0.5,
};
