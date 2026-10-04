import { createLifetime } from './lifetime';
import { mergeData } from '../diary/merge';
import { normalise } from '../diary/validation';
import { SyncConflict } from '../cloud';
import type { Remote, WindyAuth } from '../cloud';
import type { SpotlogData } from '../types';

interface SyncDependencies {
    auth(): WindyAuth | null;
    read(): SpotlogData;
    accept(data: SpotlogData): void;
    state(state: 'idle' | 'saving' | 'saved' | 'error', error?: string): void;
    pull(auth: WindyAuth): Promise<Remote | null>;
    push(auth: WindyAuth, data: SpotlogData, revision: number): Promise<number>;
}

/** One serial writer per account generation; stale completions cannot commit or retry. */
export function createSyncController(deps: SyncDependencies) {
    const lifetime = createLifetime();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let queue: Promise<void> = Promise.resolve();
    let revision: number | undefined;

    function run(pullFirst: boolean): Promise<void> {
        const valid = lifetime.capture();
        const auth = deps.auth();
        if (!auth) {return Promise.resolve();}
        const work = async () => {
            if (!valid()) {return;}
            deps.state('saving');
            try {
                for (let attempt = 0; attempt < 3; attempt++) {
                    if (pullFirst || revision === undefined || attempt > 0) {
                        const remote = await deps.pull(auth);
                        if (!valid()) {return;}
                        revision = remote?.revision ?? 0;
                        if (remote) {
                            const incoming = normalise(remote.data);
                            incoming.updatedAt = Math.max(incoming.updatedAt || 0, remote.updatedAt || 0);
                            deps.accept(mergeData(incoming, deps.read()));
                        }
                    }
                    // Clone before the await: later local changes get their own serial write.
                    const document = JSON.parse(JSON.stringify(deps.read())) as SpotlogData;
                    try {
                        const nextRevision = await deps.push(auth, document, revision ?? 0);
                        if (!valid()) {return;}
                        revision = nextRevision;
                        deps.state('saved');
                        return;
                    } catch (error) {
                        if (!(error instanceof SyncConflict) || attempt === 2) {throw error;}
                    }
                }
            } catch (error) {
                if (!valid()) {return;}
                deps.state('error', error instanceof Error ? error.message : String(error));
                clearTimeout(timer);
                timer = setTimeout(() => {if (valid()) {schedule();}}, 30e3);
            }
        };
        queue = queue.then(work, work);
        return queue;
    }
    function schedule(): void {
        clearTimeout(timer);
        const valid = lifetime.capture();
        timer = setTimeout(() => {if (valid()) {void run(false);}}, 1200);
    }
    return {
        schedule,
        sync: () => run(true),
        reset(): void {lifetime.invalidate(); clearTimeout(timer); revision = undefined; queue = Promise.resolve();},
        dispose(): void {lifetime.dispose(); clearTimeout(timer);},
    };
}
