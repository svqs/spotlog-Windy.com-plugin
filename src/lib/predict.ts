import type { Dir8, Session, Snapshot, Spot, ModelValue } from './types';
import { DIRS } from './wind';

const angDiff = (a: number, b: number): number => Math.abs((((a - b) % 360) + 540) % 360 - 180);

interface Sample { wind: number; dir: number; rating: number }

/** Sessions at a spot that have a forecast attached (the forecast is what we can compare against) */
export const samplesFor = (spot: Spot, sessions: Session[], snapshots: Snapshot[]): Sample[] =>
    sessions
        .filter(s => s.spotId === spot.id && s.snapshotId)
        .map(s => {
            const sn = snapshots.find(x => x.id === s.snapshotId);
            const p = sn?.models.find(m => m.model === sn.primary) || sn?.models[0];
            return p && p.wind !== null && p.dir !== null ? { wind: p.wind, dir: p.dir, rating: s.rating } : null;
        })
        .filter((x): x is Sample => !!x);

export const MIN_SAMPLES = 3;

/**
 * Predicts how a session would be rated in the given conditions, from the
 * user's own sessions at this spot (nearest neighbours in wind speed + direction).
 */
export const predictRating = (spot: Spot, now: ModelValue | null, sessions: Session[], snapshots: Snapshot[]): number | null => {
    if (!now || now.wind === null || now.dir === null) return null;
    const samples = samplesFor(spot, sessions, snapshots);
    if (samples.length < MIN_SAMPLES) return null;
    let wSum = 0;
    let rSum = 0;
    for (const s of samples) {
        const d = Math.abs(s.wind - (now.wind as number)) / 2.5 + angDiff(s.dir, now.dir as number) / 40;
        const w = Math.exp(-d * d);
        wSum += w;
        rSum += w * s.rating;
    }
    if (wSum < 0.05) return 1.5; // nothing like this in your history — likely not great
    return rSum / wSum;
};

export const predictionLabel = (r: number): string =>
    r >= 4.2 ? 'Likely epic' : r >= 3.5 ? 'Likely great' : r >= 2.7 ? 'Likely good' : r >= 1.9 ? 'Probably meh' : 'Probably flat';

export interface WindSuggestion {
    dirs: Dir8[];
    min: number;
    max: number;
    basedOn: number;
}

/** "I don't know yet" spots: learn the wind window from sessions rated great or epic */
export const suggestWindow = (spot: Spot, sessions: Session[], snapshots: Snapshot[]): WindSuggestion | null => {
    const good = samplesFor(spot, sessions, snapshots).filter(s => s.rating >= 4);
    if (good.length < 2) return null;
    const dirs = Array.from(new Set(good.map(s => DIRS[Math.round((((s.dir % 360) + 360) % 360) / 45) % 8])));
    const winds = good.map(s => s.wind);
    return {
        dirs: DIRS.filter(d => dirs.includes(d)),
        min: Math.max(0, Math.floor(Math.min(...winds) - 1)),
        max: Math.ceil(Math.max(...winds) + 1),
        basedOn: good.length,
    };
};
