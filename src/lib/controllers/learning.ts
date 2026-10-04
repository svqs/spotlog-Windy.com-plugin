import { learningModel, learnSpot, modelSkill, nearbySpots, bestToday } from '../predict';
import { examplesFor } from '../learn/examples';
import { canonical } from '../diary/revisions';
import { indexDiary } from '../diary/selectors';
import type { Example } from '../learn/examples';
import type { ModelSkill } from '../learn/skill';
import type { SportModel } from '../learn/model';
import type { SpotlogData } from '../types';
import type { DayBest } from '../learn/windows';
import type { Hour } from '../learn/features';

/** Per-spot dependency memoization: presentation preferences never rebuild learning. */
export function createLearningController() {
    const exampleCache = new Map<string, { key: string; models: Map<string, Example[]> }>();
    const skillCache = new Map<string, { key: string; value: ModelSkill[] }>();
    const sportCache = new Map<string, { key: string; ready: number; value: SportModel[] }>();
    const windows = new Map<string, { models: SportModel[]; hours: Hour[]; minute: number; value: DayBest | null }>();
    let state = { models: new Map<string, string>(), learned: new Map<string, SportModel[]>(), skills: new Map<string, ModelSkill[]>() };
    let previous: Pick<SpotlogData, 'spots' | 'sessions' | 'snapshots'> | undefined;
    let previousReady = -1;
    const stats = { skillEvaluations: 0, spotEvaluations: 0, exampleEvaluations: 0 };
    return {
        stats,
        best(id: string, models: SportModel[], hours: Hour[]): DayBest | null {
            const minute = Math.floor(Date.now() / 60e3);
            let result = windows.get(id);
            if (!result || result.models !== models || result.hours !== hours || result.minute !== minute) {
                result = { models, hours, minute, value: bestToday(models, hours) };
                windows.set(id, result);
            }
            return result.value;
        },
        update(data: SpotlogData, ready: number) {
            // Application commands replace entity arrays; settings have no learning dependencies.
            if (previous && previous.spots === data.spots && previous.sessions === data.sessions && previous.snapshots === data.snapshots && previousReady === ready) {return state;}
            previous = { spots: data.spots, sessions: data.sessions, snapshots: data.snapshots }; previousReady = ready;
            const index = indexDiary(data);
            const inputs = new Map(data.spots.map(spot => {
                const sessions = index.sessionsBySpot.get(spot.id) || [];
                const ids = new Set(sessions.map(session => session.snapshotId));
                const snapshots = [...ids].flatMap(id => id && index.snapshots.has(id) ? [index.snapshots.get(id)!] : []);
                const key = canonical([
                    spot,
                    sessions.map(({ notes: _notes, gear: _gear, track: _track, ...session }) => session),
                    snapshots.map(({ note: _note, ...snapshot }) => snapshot),
                ]);
                return [spot.id, { sessions, snapshots, key }] as const;
            }));
            const readExamples: typeof examplesFor = (spot, _sessions, _snapshots, model) => {
                const input = inputs.get(spot.id)!;
                let cached = exampleCache.get(spot.id);
                if (!cached || cached.key !== input.key) {
                    cached = { key: input.key, models: new Map() }; exampleCache.set(spot.id, cached);
                }
                let examples = cached.models.get(model);
                if (!examples) {
                    stats.exampleEvaluations++;
                    examples = examplesFor(spot, input.sessions, input.snapshots, model); cached.models.set(model, examples);
                }
                return examples;
            };
            const models = new Map<string, string>();
            const skills = new Map<string, ModelSkill[]>();
            const learned = new Map<string, SportModel[]>();
            let changed = state.models.size !== data.spots.length;
            for (const spot of data.spots) {
                const input = inputs.get(spot.id)!;
                let skill = skillCache.get(spot.id);
                if (!skill || skill.key !== input.key) {
                    stats.skillEvaluations++;
                    skill = { key: input.key, value: modelSkill(spot, input.sessions, input.snapshots, readExamples) };
                    skillCache.set(spot.id, skill);
                }
                const model = learningModel(spot, input.sessions, input.snapshots, skill.value);
                const neighbors = nearbySpots(spot, data.spots).map(neighbor => inputs.get(neighbor.id)!);
                const key = canonical([model, input.key, neighbors.map(neighbor => neighbor.key)]);
                let sports = sportCache.get(spot.id);
                if (!sports || sports.key !== key || sports.ready !== ready) {
                    stats.spotEvaluations++;
                    sports = { key, ready, value: learnSpot(spot, data.spots,
                        [...input.sessions, ...neighbors.flatMap(neighbor => neighbor.sessions)],
                        [...input.snapshots, ...neighbors.flatMap(neighbor => neighbor.snapshots)], model, readExamples) };
                    sportCache.set(spot.id, sports);
                }
                models.set(spot.id, model); skills.set(spot.id, skill.value); learned.set(spot.id, sports.value);
                changed ||= state.models.get(spot.id) !== model || state.learned.get(spot.id) !== sports.value || state.skills.get(spot.id) !== skill.value;
            }
            for (const id of skillCache.keys()) {if (!models.has(id)) {skillCache.delete(id); sportCache.delete(id); windows.delete(id); exampleCache.delete(id);}}
            if (changed) {state = { models, learned, skills };}
            return state;
        },
        clear(): void {previous = undefined; previousReady = -1; skillCache.clear(); sportCache.clear(); windows.clear(); exampleCache.clear();},
    };
}
