/**
 * Which forecast to trust here: for every model saved with your outings, how well its forecasts foretold how
 * your sessions at this spot went. Each outing is guessed from your outings on other days (leave one day out),
 * with weighted similar sessions on that model's values; the model whose guesses missed least foretells best.
 * Only informs: the spot keeps learning from its one recommendation model (docs/learning.md).
 */
import { TRUST } from './config';
import { examplesFor } from './examples';
import { priorOf } from './ranges';
import { similar } from './similar';
import type { Session, Snapshot, Spot } from '../types';

export interface ModelSkill {
    model: string;
    /** average miss of its guesses, in rating points (1–5 scale) */
    miss: number;
    /** outings it was checked on */
    count: number;
}

/** The models saved with this spot's sessions, best first (only those checked on enough outings) */
export function modelSkill(spot: Spot, sessions: Session[], snapshots: Snapshot[]): ModelSkill[] {
    const linked = new Set(sessions.filter(s => s.spotId === spot.id && s.snapshotId).map(s => s.snapshotId));
    const models = new Set(snapshots.filter(sn => linked.has(sn.id)).flatMap(sn => Object.keys(sn.series?.models || {})));
    const out: ModelSkill[] = [];
    for (const model of models) {
        const outings = examplesFor(spot, sessions, snapshots, model).filter(e => e.kind === 'outing');
        let miss = 0;
        let count = 0;
        for (const e of outings) {
            const others = outings.filter(o => o.sport === e.sport && o.day !== e.day);
            const s = similar(e.sport, e.x, others, [], priorOf(spot, e.sport));
            if (s.score !== null) {
                miss += Math.abs(s.score - e.rating);
                count++;
            }
        }
        if (count >= TRUST.minSessions) {out.push({ model, miss: miss / count, count });}
    }
    return out.sort((a, b) => a.miss - b.miss);
}
