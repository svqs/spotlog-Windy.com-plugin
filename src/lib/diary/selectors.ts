import type { SpotlogData } from '../types';

const indexes = new WeakMap<SpotlogData, ReturnType<typeof buildIndex>>();
export function indexDiary(data: SpotlogData) {
    let index = indexes.get(data);
    if (!index || index.sourceSpots !== data.spots || index.sourceSnapshots !== data.snapshots || index.sourceSessions !== data.sessions) {
        index = buildIndex(data); indexes.set(data, index);
    }
    return index;
}
function buildIndex(data: SpotlogData) {
    const sessionsBySpot = new Map<string, SpotlogData['sessions']>();
    for (const session of data.sessions) {
        if (!session.spotId) {continue;}
        const sessions = sessionsBySpot.get(session.spotId) || [];
        sessions.push(session);
        sessionsBySpot.set(session.spotId, sessions);
    }
    return { sourceSpots: data.spots, sourceSnapshots: data.snapshots, sourceSessions: data.sessions, spots: new Map(data.spots.map(spot => [spot.id, spot])),
        snapshots: new Map(data.snapshots.map(snapshot => [snapshot.id, snapshot])), sessionsBySpot };
}
