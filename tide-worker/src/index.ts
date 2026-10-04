/**
 * spotlog – tide error reports (Cloudflare Worker)
 *
 * POST /report   from the plugin, when Windy's tide endpoint misbehaves for a Premium user.
 * GET  /reports  for you; needs `Authorization: Bearer <REPORTS_TOKEN>`.
 *
 * Stores each report in KV for 30 days. If NOTIFY_URL is set (for example an
 * ntfy.sh topic URL, which pushes to your phone), it also sends one notification
 * per error kind per day.
 *
 * Reports carry no coordinates and no user id; IP addresses are not stored.
 */

import { readTextLimited } from '../../src/lib/http.ts';

export interface Env {
    REPORTS: KVNamespace;
    /** Secret: token for GET /reports. */
    REPORTS_TOKEN: string;
    /** Optional secret: URL that receives a plain-text POST per new error kind per day. */
    NOTIFY_URL?: string;
}

const ALLOWED_ORIGINS = new Set(['https://www.windy.com', 'https://windy.com']);

const KINDS = new Set([
    'timeout',
    'unauthorized-premium',
    'not-found',
    'server',
    'client',
    'shape',
    'too-few-extremes',
    'stale-window',
    'unknown',
]);

const MAX_BODY = 2048;
const TTL_SECONDS = 30 * 24 * 3600;

interface Report {
    kind: string;
    status: number | null;
    shape: string | null;
    plugin: string;
    receivedAt: string;
    country: string | null;
}

export default {
    async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(req.url);
        const origin = req.headers.get('origin');

        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors(origin) });
        }

        if (url.pathname === '/report' && req.method === 'POST') {
            if (origin && !ALLOWED_ORIGINS.has(origin)) {
                return new Response('forbidden', { status: 403 });
            }
            const report = await readReport(req);
            if (!report) {
                return new Response('bad request', { status: 400, headers: cors(origin) });
            }

            const day = report.receivedAt.slice(0, 10);
            // Inverted timestamp so KV's sorted listing returns newest first.
            const inverted = String(9_999_999_999_999 - Date.now()).padStart(13, '0');
            const key = `r:${inverted}:${crypto.randomUUID().slice(0, 8)}`;
            ctx.waitUntil(env.REPORTS.put(key, JSON.stringify(report), { expirationTtl: TTL_SECONDS }));
            ctx.waitUntil(notifyOncePerDay(env, report, day));

            return new Response(null, { status: 204, headers: cors(origin) });
        }

        if (url.pathname === '/reports' && req.method === 'GET') {
            if (req.headers.get('authorization') !== `Bearer ${env.REPORTS_TOKEN}`) {
                return new Response('unauthorized', { status: 401 });
            }
            const list = await env.REPORTS.list({ prefix: 'r:', limit: 200 });
            const items = await Promise.all(list.keys.map(k => env.REPORTS.get(k.name, 'json')));
            const reports = (items.filter(Boolean) as Report[]).sort((a, b) =>
                b.receivedAt.localeCompare(a.receivedAt),
            );
            return Response.json({ count: reports.length, reports });
        }

        return new Response('not found', { status: 404 });
    },
};

/** Parse and whitelist the plugin's report. Returns null if anything is off. */
const readReport = async (req: Request): Promise<Report | null> => {
    const text = await readTextLimited(req, MAX_BODY);
    if (!text) return null;

    let body: Record<string, unknown>;
    try {
        body = JSON.parse(text);
    } catch {
        return null;
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;

    const kind = typeof body.kind === 'string' && KINDS.has(body.kind) ? body.kind : null;
    if (!kind) return null;

    const status = Number.isInteger(body.status) ? (body.status as number) : null;
    const shape = typeof body.shape === 'string' ? body.shape.slice(0, 400) : null;
    const plugin = typeof body.plugin === 'string' ? body.plugin.slice(0, 20) : 'unknown';
    const country = (req as Request & { cf?: { country?: string } }).cf?.country ?? null;

    return { kind, status, shape, plugin, receivedAt: new Date().toISOString(), country };
};

const notifyOncePerDay = async (env: Env, r: Report, day: string): Promise<void> => {
    if (!env.NOTIFY_URL) return;
    const flag = `n:${r.kind}:${day}`;
    if (await env.REPORTS.get(flag)) return;
    await env.REPORTS.put(flag, '1', { expirationTtl: 2 * 24 * 3600 });

    const msg =
        `spotlog: Windy tide error "${r.kind}"` +
        (r.status ? ` (HTTP ${r.status})` : '') +
        `, plugin ${r.plugin}.` +
        (r.shape ? `\nResponse shape: ${r.shape}` : '');

    try {
        await fetch(env.NOTIFY_URL, { method: 'POST', body: msg, headers: { 'content-type': 'text/plain' } });
    } catch {
        // Reports are still in KV.
    }
};

const cors = (origin: string | null): HeadersInit =>
    origin && ALLOWED_ORIGINS.has(origin)
        ? {
              'access-control-allow-origin': origin,
              'access-control-allow-methods': 'POST, OPTIONS',
              'access-control-allow-headers': 'content-type',
              vary: 'origin',
          }
        : {};
