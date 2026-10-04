/**
 * Optional backend-neutral sync transport; production sync is disabled while CLOUD.functionUrl is empty.
 * A future backend must verify the Windy login and implement conditional writes before it is enabled.
 *
 * In the sandbox, `window.__spotlogCloudMock` replaces the network with an in-memory fake.
 */
import { CLOUD } from './cloudConfig';
import type { SpotlogData } from './types';

export interface WindyAuth { id: number; token: string | null }
export interface Remote { data: SpotlogData; updatedAt: number; revision: number }

interface Backend {
    pull(a: WindyAuth): Promise<Remote | null>;
    push(a: WindyAuth, data: SpotlogData, expectedRevision: number): Promise<number>;
    remove(a: WindyAuth): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mock = (): Backend | null => (typeof window !== 'undefined' && (window as any).__spotlogCloudMock) || null;

export class SyncConflict extends Error {
    constructor() {super('Sync conflict');}
}


async function call<T>(method: string, a: WindyAuth, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15e3);
    try {
    const res = await fetch(CLOUD.functionUrl, {
        signal: controller.signal,
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-windy-user': String(a.id),
            ...(a.token ? { 'x-windy-token': a.token } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = text ? JSON.parse(text) : null;
    if (res.status === 409) {throw new SyncConflict();}
    if (!res.ok) {throw new Error(json?.error || `Sync failed (${res.status})`);}
    return json as T;
    } finally {clearTimeout(timeout);}
}


const server: Backend = {
    pull: a => call<Remote | null>('GET', a),
    push: async (a, data, expectedRevision) => (await call<{ revision: number }>('PUT', a, { data, expectedRevision })).revision,
    remove: async a => { await call('DELETE', a); },
};

const backend = (): Backend | null => mock() || (CLOUD.functionUrl ? server : null);

/** Is sync set up in this build? */
export const cloudAvailable = (): boolean => !!backend();

export async function pull(a: WindyAuth): Promise<Remote | null> {
    const b = backend();
    return b ? b.pull(a) : null;
}
export async function push(a: WindyAuth, data: SpotlogData, expectedRevision: number): Promise<number> {
    const b = backend();
    try {return b ? await b.push(a, data, expectedRevision) : expectedRevision;}
    catch (error) {
        if (error instanceof SyncConflict || (error as { status?: number })?.status === 409) {throw new SyncConflict();}
        throw error;
    }
}
export async function removeRemote(a: WindyAuth): Promise<void> {
    const b = backend();
    if (b) {await b.remove(a);}
}
