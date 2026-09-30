// Spotlog sync — Supabase Edge Function (Deno).
// Stores one diary per Windy user. There is no Spotlog login: the plugin sends the Windy user id and
// Windy's login token, and this function asks Windy who the token belongs to before touching any data.
//
// Deploy:  supabase functions deploy spotlog --no-verify-jwt
// Secrets: supabase secrets set WINDY_VERIFY_URL=...            (Windy endpoint that returns the logged-in user for a token)
//          supabase secrets set ALLOW_UNVERIFIED_TEST_IDS=123,456 (optional, private testing only: these Windy ids
//                                                                    are trusted without a token check)
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const VERIFY_URL = Deno.env.get('WINDY_VERIFY_URL') || '';
const TEST_IDS = (Deno.env.get('ALLOW_UNVERIFIED_TEST_IDS') || '').split(',').map(s => s.trim()).filter(Boolean);
const ORIGINS = ['https://www.windy.com', 'https://windy.com'];
const MAX_BYTES = 10 * 1024 * 1024;

const cors = (req: Request) => ({
    'Access-Control-Allow-Origin': ORIGINS.includes(req.headers.get('origin') || '') ? req.headers.get('origin')! : ORIGINS[0],
    'Access-Control-Allow-Headers': 'content-type, x-windy-user, x-windy-token',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    Vary: 'Origin',
});
const json = (req: Request, body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors(req), 'Content-Type': 'application/json' } });

/** Returns the verified Windy user id, or null */
async function windyUser(req: Request): Promise<number | null> {
    const claimed = (req.headers.get('x-windy-user') || '').trim();
    const token = req.headers.get('x-windy-token') || '';
    if (VERIFY_URL && token) {
        try {
            const r = await fetch(VERIFY_URL, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
            if (!r.ok) return null;
            const j = await r.json();
            const id = j?.id ?? j?.user?.id ?? j?.userInfo?.id;
            if (typeof id === 'number' && (!claimed || String(id) === claimed)) return id;
            return null;
        } catch {
            return null;
        }
    }
    if (claimed && TEST_IDS.includes(claimed)) return Number(claimed);
    return null;
}

Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
    const id = await windyUser(req);
    if (!id) return json(req, { error: 'Could not confirm your Windy login' }, 401);

    if (req.method === 'GET') {
        const { data, error } = await db.from('spotlog_diary').select('data, updated_at').eq('windy_user_id', id).maybeSingle();
        if (error) return json(req, { error: error.message }, 500);
        return json(req, data ? { data: data.data, updatedAt: Date.parse(data.updated_at) } : null);
    }
    if (req.method === 'PUT') {
        const text = await req.text();
        if (text.length > MAX_BYTES) return json(req, { error: 'Diary is too large' }, 413);
        const body = JSON.parse(text);
        const updatedAt = new Date(body?.data?.updatedAt || Date.now()).toISOString();
        const { error } = await db.from('spotlog_diary').upsert({ windy_user_id: id, data: body.data, updated_at: updatedAt });
        if (error) return json(req, { error: error.message }, 500);
        return json(req, { ok: true });
    }
    if (req.method === 'DELETE') {
        const { error } = await db.from('spotlog_diary').delete().eq('windy_user_id', id);
        if (error) return json(req, { error: error.message }, 500);
        return json(req, { ok: true });
    }
    return json(req, { error: 'Method not allowed' }, 405);
});
