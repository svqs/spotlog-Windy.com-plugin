/**
 * spotlog – tides
 *
 * Adds tide to a saved forecast, using Windy's own tide forecast only.
 *
 *  - Windy Premium users: tide from Windy (WorldTides / FES2022).
 *  - Free users: no tide; the forecast card says tide comes with Premium (`tidePremium` in copy.ts).
 *  - If Windy fails for a Premium user: the forecast is saved without tide, and a small error report is sent
 *    (when TIDE_REPORT_URL in links.ts is set) so it can be raised with Windy.
 *
 * Usage (forecast.ts):
 *   const res = await takeTideSnapshot(lat, lon);
 *   if (res.status === 'ok') ... res.snapshot.extremes
 * The credits (`tideCredits` in copy.ts) are shown on How it works, as the data licence asks.
 */

import { getTideForecastUrl } from '@windy/fetch';
import { get as httpGet } from '@windy/http';
import { hasAny as hasPremium } from '@windy/subscription';

import { parseWindyTides, shapeSignature, startOfUtcDay } from './tideCore';
import type { TideSnapshot } from './tideCore';

export { tideAt, tideForSession } from './tideCore';
export type { SessionTide, TideAt, TideExtreme, TideSnapshot } from './tideCore';

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

const WINDY_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 1_500;

export type TideSnapshotResult =
    | { status: 'ok'; snapshot: TideSnapshot }
    /** Free, logged out, or Premium has lapsed. The forecast card says tide comes with Premium. */
    | { status: 'premium-required' }
    /**
     * No tide this time; save the snapshot without it.
     * 'offline': the user's connection failed. 'windy-error': Windy failed (already reported).
     */
    | { status: 'unavailable'; reason: 'offline' | 'windy-error' };

interface TideConfig {
    /** Error-report endpoint (the Cloudflare Worker). Empty disables reporting. */
    reportUrl: string;
    pluginVersion: string;
}

const config: TideConfig = { reportUrl: '', pluginVersion: '0.0.0' };

export const configureTides = (c: Partial<TideConfig>): void => {
    Object.assign(config, c);
};

export const isPremium = (): boolean => {
    try {
        return hasPremium();
    } catch {
        return false;
    }
};

/**
 * Get the tide window for a spot, to store in a conditions snapshot.
 * Never throws.
 */
export const takeTideSnapshot = async (
    lat: number,
    lon: number,
    now: number = Date.now(),
): Promise<TideSnapshotResult> => {
    if (!isPremium()) {
        return { status: 'premium-required' };
    }

    const windy = await fetchWindyTides(lat, lon, now);
    if (windy.ok) {
        return { status: 'ok', snapshot: windy.snapshot };
    }
    if (windy.kind === 'not-premium') {
        return { status: 'premium-required' };
    }
    if (windy.kind === 'network') {
        return { status: 'unavailable', reason: 'offline' };
    }

    void reportTideError({ kind: windy.kind, status: windy.status, shape: windy.shape });
    return { status: 'unavailable', reason: 'windy-error' };
};

// ---------------------------------------------------------------------------
// Windy
// ---------------------------------------------------------------------------

type WindyFailureKind =
    | 'not-premium' // 401 and the user is no longer Premium: expected, no report
    | 'network' // offline or connection failed after a retry: user's side, no report
    | 'timeout' // no answer within the timeout after a retry: report
    | 'unauthorized-premium' // 401/403 although the user is Premium: report
    | 'not-found' // 404: endpoint moved or removed: report
    | 'server' // 5xx after a retry: report
    | 'client' // other 4xx: report
    | 'shape' // 200 with an unexpected body: report
    | 'too-few-extremes' // 200 but under two highs/lows: report
    | 'stale-window' // 200 but the window doesn't include now: report
    | 'unknown';

type WindyResult =
    | { ok: true; snapshot: TideSnapshot }
    | { ok: false; kind: WindyFailureKind; status?: number; shape?: string };

async function fetchWindyTides(lat: number, lon: number, now: number): Promise<WindyResult> {
    let last: WindyResult = { ok: false, kind: 'unknown' };

    for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {await sleep(RETRY_DELAY_MS);}

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), WINDY_TIMEOUT_MS);
        try {
            const url = getTideForecastUrl({ lat, lon });
            const res = await httpGet<unknown>(url, { abortSignal: ctrl.signal, cache: false });

            const parsed = parseWindyTides(res.data, lat, lon, now);
            if (parsed.ok) {return { ok: true, snapshot: parsed.snapshot };}
            // A bad body won't get better on retry.
            return { ok: false, kind: parsed.problem, status: res.status, shape: parsed.signature };
        } catch (err) {
            last = classifyFailure(err, ctrl.signal.aborted);
            const retryable = last.ok === false && ['network', 'timeout', 'server'].includes(last.kind);
            if (!retryable) {return last;}
        } finally {
            clearTimeout(timer);
        }
    }
    return last;
}

function classifyFailure(err: unknown, aborted: boolean): WindyResult {
    if (aborted) {return { ok: false, kind: 'timeout' };}

    // Windy's http module throws an error carrying the HTTP status.
    const status = typeof (err as { status?: unknown })?.status === 'number' ? (err as { status: number }).status : 0;

    if (status === 401 || status === 403) {
        // Premium may have lapsed or the login expired since we checked.
        return isPremium()
            ? { ok: false, kind: 'unauthorized-premium', status }
            : { ok: false, kind: 'not-premium', status };
    }
    if (status === 404) {return { ok: false, kind: 'not-found', status };}
    if (status >= 500) {return { ok: false, kind: 'server', status };}
    if (status >= 400) {return { ok: false, kind: 'client', status };}

    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (offline || err instanceof TypeError || status === 0) {
        return { ok: false, kind: 'network' };
    }
    return { ok: false, kind: 'unknown', status };
}

// ---------------------------------------------------------------------------
// Error reports
// ---------------------------------------------------------------------------

interface TideErrorReport {
    kind: WindyFailureKind;
    status?: number;
    /** Structure of Windy's response with no values in it. */
    shape?: string;
}

/**
 * Send a minimal report: what failed, HTTP status, response structure, plugin
 * version, time. No coordinates, no user id. At most one per kind per day per browser.
 */
async function reportTideError(r: TideErrorReport): Promise<void> {
    if (!config.reportUrl) {return;}

    const dedupeKey = `spotlog:tideErr:${r.kind}:${startOfUtcDay(Date.now())}`;
    try {
        if (localStorage.getItem(dedupeKey)) {return;}
        localStorage.setItem(dedupeKey, '1');
    } catch {
        // Storage blocked: report anyway.
    }

    const body = JSON.stringify({
        kind: r.kind,
        status: r.status ?? null,
        shape: r.shape ? r.shape.slice(0, 400) : null,
        plugin: config.pluginVersion,
        at: new Date().toISOString(),
    });

    try {
        // text/plain keeps this a "simple" request: no CORS preflight.
        await fetch(config.reportUrl, {
            method: 'POST',
            body,
            headers: { 'content-type': 'text/plain' },
            keepalive: true,
        });
    } catch {
        // Reporting must never break the plugin.
    }
}

// Exposed for tests only.
export const __test = { classifyFailure, shapeSignature };

