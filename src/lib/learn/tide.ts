/**
 * Tides: the state at a time from the high/low tide times saved with the forecast, and the tide
 * most of your great sessions had. Nobody types the tide in.
 */

/** Low / Mid / High (the third of the way nearest a high or low) and Rising / Falling, from saved highs and lows */
export function tideAt(t: { highs: number[]; lows: number[] } | undefined | null, ts: number): { tide: string | null; move: string | null } | null {
    if (!t) {return null;}
    const ev = [...t.highs.map(x => ({ x, hi: true })), ...t.lows.map(x => ({ x, hi: false }))].sort((a, b) => a.x - b.x);
    const before = ev.filter(e => e.x <= ts).pop();
    const after = ev.find(e => e.x > ts);
    if (!before || !after || before.hi === after.hi || after.x - before.x > 9 * 3600e3) {return null;}
    const f = (ts - before.x) / (after.x - before.x);
    const near = f < 1 / 3 ? before : f > 2 / 3 ? after : null;
    return { tide: near ? (near.hi ? 'High' : 'Low') : 'Mid', move: before.hi ? 'Falling' : 'Rising' };
}

export interface TideHint { tide: string | null; move: string | null; of: number; total: number }

/** The tide most of your great sessions here had (needs 2+ great sessions with a known tide, and a majority) */
export const bestTide = (list: { rating: number; tide?: string | null; tideMove?: string | null }[]): TideHint | null => {
    const good = list.filter(s => s.rating >= 4 && (s.tide || s.tideMove));
    if (good.length < 2) {return null;}
    const top = (k: 'tide' | 'tideMove') => {
        const n = new Map<string, number>();
        good.forEach(s => { const x = s[k]; if (x) {n.set(x, (n.get(x) || 0) + 1);} });
        const [v, c] = [...n.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0];
        return c >= Math.max(2, Math.ceil(good.length / 2)) ? { v, c } : null;
    };
    const t = top('tide');
    const m = top('tideMove');
    if (!t && !m) {return null;}
    return { tide: t?.v ?? null, move: m?.v ?? null, of: Math.min(t?.c ?? Infinity, m?.c ?? Infinity), total: good.length };
};
