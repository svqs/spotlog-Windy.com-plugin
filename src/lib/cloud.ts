/**
 * Account sync: keeps the whole diary (one JSON document per user) in a Supabase table,
 * so it follows you to every browser and device. Sign-in is a 6-digit code sent by email.
 *
 * Talks to Supabase's REST endpoints directly (no SDK, keeps the plugin small).
 * In the sandbox, `window.__spotlogCloudMock` replaces the network with an in-memory fake.
 */
import { CLOUD } from './cloudConfig';
import type { SpotlogData } from './types';

const AUTH_KEY = 'windy-plugin-spotlog:auth';

export interface CloudUser { id: string; email: string }
interface AuthSession { access_token: string; refresh_token: string; expires_at: number; user: CloudUser }
export interface Remote { data: SpotlogData; updatedAt: number }

interface Backend {
    sendCode(email: string): Promise<void>;
    verify(email: string, code: string): Promise<AuthSession>;
    refresh(refreshToken: string): Promise<AuthSession>;
    pull(s: AuthSession): Promise<Remote | null>;
    push(s: AuthSession, data: SpotlogData): Promise<void>;
    remove(s: AuthSession): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mock = (): Backend | null => (typeof window !== 'undefined' && (window as any).__spotlogCloudMock) || null;

const hdr = (token?: string): Record<string, string> => ({
    apikey: CLOUD.anonKey,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

async function call<T>(path: string, init: RequestInit): Promise<T> {
    const res = await fetch(CLOUD.url.replace(/\/$/, '') + path, init);
    const text = await res.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(body?.msg || body?.message || body?.error_description || `Request failed (${res.status})`);
    return body as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toSession = (b: any): AuthSession => ({
    access_token: b.access_token,
    refresh_token: b.refresh_token,
    expires_at: Date.now() + (b.expires_in || 3600) * 1000,
    user: { id: b.user?.id, email: b.user?.email },
});

const supabase: Backend = {
    async sendCode(email) {
        await call('/auth/v1/otp', { method: 'POST', headers: hdr(), body: JSON.stringify({ email, create_user: true }) });
    },
    async verify(email, code) {
        return toSession(await call('/auth/v1/verify', { method: 'POST', headers: hdr(), body: JSON.stringify({ type: 'email', email, token: code }) }));
    },
    async refresh(refreshToken) {
        return toSession(await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: hdr(), body: JSON.stringify({ refresh_token: refreshToken }) }));
    },
    async pull(s) {
        const rows = await call<{ data: SpotlogData; updated_at: string }[]>(
            `/rest/v1/spotlog_data?select=data,updated_at&user_id=eq.${encodeURIComponent(s.user.id)}`,
            { method: 'GET', headers: hdr(s.access_token) },
        );
        return rows && rows[0] ? { data: rows[0].data, updatedAt: Date.parse(rows[0].updated_at) } : null;
    },
    async push(s, data) {
        await call('/rest/v1/spotlog_data', {
            method: 'POST',
            headers: { ...hdr(s.access_token), Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({ user_id: s.user.id, data, updated_at: new Date(data.updatedAt || Date.now()).toISOString() }),
        });
    },
    async remove(s) {
        await call(`/rest/v1/spotlog_data?user_id=eq.${encodeURIComponent(s.user.id)}`, {
            method: 'DELETE',
            headers: { ...hdr(s.access_token), Prefer: 'return=minimal' },
        });
    },
};

const backend = (): Backend | null => mock() || (CLOUD.url && CLOUD.anonKey ? supabase : null);

/** Is account sync available in this build? */
export const cloudAvailable = (): boolean => !!backend();

const readSession = (): AuthSession | null => {
    try {
        const raw = localStorage.getItem(AUTH_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};
const writeSession = (s: AuthSession | null) => {
    try {
        if (s) localStorage.setItem(AUTH_KEY, JSON.stringify(s));
        else localStorage.removeItem(AUTH_KEY);
    } catch {
        /* storage unavailable */
    }
};

export const currentUser = (): CloudUser | null => (backend() ? readSession()?.user || null : null);

async function session(): Promise<AuthSession | null> {
    const b = backend();
    const s = readSession();
    if (!b || !s) return null;
    if (s.expires_at - Date.now() > 60e3) return s;
    try {
        const fresh = await b.refresh(s.refresh_token);
        writeSession(fresh);
        return fresh;
    } catch (e) {
        console.info('[spotlog] could not refresh the sign-in', e);
        return null;
    }
}

export async function sendCode(email: string): Promise<void> {
    const b = backend();
    if (!b) throw new Error('Account sync is not set up in this build');
    await b.sendCode(email.trim());
}

export async function verifyCode(email: string, code: string): Promise<CloudUser> {
    const b = backend();
    if (!b) throw new Error('Account sync is not set up in this build');
    const s = await b.verify(email.trim(), code.trim());
    writeSession(s);
    return s.user;
}

export function signOut(): void {
    writeSession(null);
}

export async function pull(): Promise<Remote | null> {
    const b = backend();
    const s = await session();
    if (!b || !s) return null;
    return b.pull(s);
}

export async function push(data: SpotlogData): Promise<void> {
    const b = backend();
    const s = await session();
    if (!b || !s) throw new Error('Not signed in');
    await b.push(s, data);
}

/** Deletes the diary from the account (this browser keeps its copy) and signs out */
export async function deleteAccountData(): Promise<void> {
    const b = backend();
    const s = await session();
    if (!b || !s) throw new Error('Not signed in');
    await b.remove(s);
    signOut();
}
