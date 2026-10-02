/**
 * Sync: the diary is stored per Windy user, so logging in to Windy on another device shows the same data.
 * There is no separate Spotlog sign-in. Each request carries the Windy user id and Windy's own login token;
 * the server (supabase/functions/spotlog) checks the token with Windy before it reads or writes that user's diary.
 *
 * In the sandbox, `window.__spotlogCloudMock` replaces the network with an in-memory fake.
 */
import { CLOUD } from './cloudConfig';
import type { SpotlogData } from './types';

export interface WindyAuth { id: number; token: string | null }
export interface Remote { data: SpotlogData; updatedAt: number }

interface Backend {
    pull(a: WindyAuth): Promise<Remote | null>;
    push(a: WindyAuth, data: SpotlogData): Promise<void>;
    remove(a: WindyAuth): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mock = (): Backend | null => (typeof window !== 'undefined' && (window as any).__spotlogCloudMock) || null;

async function call<T>(method: string, a: WindyAuth, body?: unknown): Promise<T> {
    const res = await fetch(CLOUD.functionUrl, {
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
    if (!res.ok) {throw new Error(json?.error || `Sync failed (${res.status})`);}
    return json as T;
}

const server: Backend = {
    pull: a => call<Remote | null>('GET', a),
    push: async (a, data) => { await call('PUT', a, { data }); },
    remove: async a => { await call('DELETE', a); },
};

const backend = (): Backend | null => mock() || (CLOUD.functionUrl ? server : null);

/** Is sync set up in this build? */
export const cloudAvailable = (): boolean => !!backend();

export async function pull(a: WindyAuth): Promise<Remote | null> {
    const b = backend();
    return b ? b.pull(a) : null;
}
export async function push(a: WindyAuth, data: SpotlogData): Promise<void> {
    const b = backend();
    if (b) {await b.push(a, data);}
}
export async function removeRemote(a: WindyAuth): Promise<void> {
    const b = backend();
    if (b) {await b.remove(a);}
}
