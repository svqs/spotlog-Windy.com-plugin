import type { Session } from './types';

const formatters = new Map<string, Intl.DateTimeFormat>();
function timeFormatter(tz?: string): Intl.DateTimeFormat {
    const key = tz || 'device';
    let formatter = formatters.get(key);
    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
        formatters.set(key, formatter);
        while (formatters.size > 128) {formatters.delete(formatters.keys().next().value as string);}
    }
    return formatter;
}

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;
/** Minutes the time zone is ahead of UTC at a moment (device time zone when unknown or invalid) */
function offsetMin(ts: number, tz?: string): number {
    try {
        const parts = timeFormatter(tz).formatToParts(new Date(ts));
        const n = (t: string) => Number(parts.find(p => p.type === t)?.value);
        return Math.round((Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute')) - Math.floor(ts / 60e3) * 60e3) / 60e3);
    } catch {
        return tz ? offsetMin(ts) : -new Date(ts).getTimezoneOffset();
    }
}
const localMinutes = (ts: number, tz?: string) => (((Math.floor(ts / 60e3) + offsetMin(ts, tz)) % 1440) + 1440) % 1440;

/** The local calendar day of a moment, "YYYY-MM-DD" */
export const dayKey = (ts: number, tz?: string): string => new Date(ts + offsetMin(ts, tz) * 60e3).toISOString().slice(0, 10);

/** A form's local calendar date and clock interpreted in its recorded timezone. */
export function clockInstant(day: string, clock: string, tz?: string): number {
    if (!CLOCK.test(clock) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {return NaN;}
    const naive = Date.parse(`${day}T${clock}:00Z`);
    if (!Number.isFinite(naive)) {return NaN;}
    let instant = naive;
    for (let attempt = 0; attempt < 3; attempt++) {instant = naive - offsetMin(instant, tz) * 60e3;}
    return instant;
}

/**
 * When the outing started and ended. `date` is the start; the end clock is read in the session's own time zone
 * (an end before the start is the next day; daylight-saving changes are handled). No start clock = limited.
 */
export function outingTimes(s: Session): { start: number; end: number | null; limited: boolean } {
    const start = s.date;
    const m = CLOCK.exec(s.end || '');
    if (!CLOCK.test(s.start || '') || !m) {return { start, end: null, limited: !CLOCK.test(s.start || '') };}
    const delta = (Number(m[1]) * 60 + Number(m[2]) - localMinutes(start, s.tz) + 1440) % 1440;
    if (!delta) {return { start, end: null, limited: false };}
    const guess = start + delta * 60e3;
    return { start, end: guess - (offsetMin(guess, s.tz) - offsetMin(start, s.tz)) * 60e3, limited: false };
}
