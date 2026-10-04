/**
 * When to go: windows of WINDOW.hours (1 = every hour on its own) rolling over the coming forecast, per sport.
 * A window counts only when every hour in it rates Good or better on its own and the window as a whole does too.
 * Qualifying windows next to each other merge into one stretch; a forecast gap is never bridged.
 */
import { WINDOW } from './config';
import { summarize, toFeatures, type Hour } from './features';
import { rate, type Result, type SportModel } from './model';
import { cutoff } from './similar';

export interface DayBest {
    start: number;
    end: number;
    /** mean score of the stretch's windows (1–5) */
    rating: number;
    level: number;
    sport: string;
    source: Result['source'];
    /** similar local outings behind it */
    support: number;
    /** the stretch is on right now */
    now: boolean;
}

const HOUR = 3600e3;

/** How long each forecast hour stands for: hourly data 1 h, a model's own 3-hour steps 3 h */
const stepsOf = (hours: Hour[]): number[] =>
    hours.map((h, i) => Math.min(3 * HOUR, ...[hours[i - 1] && h.ts - hours[i - 1].ts, hours[i + 1] && hours[i + 1].ts - h.ts].filter((g): g is number => !!g)) || HOUR);

/** Daylight hours split wherever an hour is missing (a gap longer than 1.5 × the hours' own step) */
function runs(hours: Hour[]): Hour[][] {
    const list = [...hours].sort((a, b) => a.ts - b.ts);
    const step = stepsOf(list);
    const out: Hour[][] = [];
    list.forEach((h, i) => {
        const prev = list[i - 1];
        const joined = prev && prev.day && h.day && h.ts - prev.ts <= 1.5 * Math.min(step[i - 1], step[i]);
        if (h.day) {joined ? out[out.length - 1].push(h) : out.push([h]);}
    });
    return out;
}

/** The qualifying stretches of one sport in a run of hours */
function stretches(m: SportModel, run: Hour[]): DayBest[] {
    const step = stepsOf(run);
    const rated = run.map(h => rate(m, toFeatures(h)));
    const wins: { i: number; j: number; r: Result }[] = [];
    for (let i = 0; i < run.length; i++) {
        let j = i;
        while (j < run.length && run[j].ts - run[i].ts + step[j] < WINDOW.hours * HOUR) {j++;}
        if (j >= run.length) {break;}
        // every hour must look Good on its own (forecast, evidence and score), and the window as a whole too
        if (rated.slice(i, j + 1).some(h => h.level < 3)) {continue;}
        const r = rate(m, summarize(run.slice(i, j + 1).map(toFeatures)));
        if (r.level >= 3) {wins.push({ i, j, r });}
    }
    const out: DayBest[] = [];
    let group: typeof wins = [];
    const close = () => {
        if (!group.length) {return;}
        const mean = group.reduce((a, w) => a + (w.r.score as number), 0) / group.length;
        const last = group[group.length - 1];
        out.push({
            start: run[group[0].i].ts, end: run[last.j].ts + step[last.j], rating: mean, sport: m.sport,
            level: Math.min(cutoff(mean), ...group.map(w => w.r.cap)), source: group[0].r.source, support: Math.max(...group.map(w => w.r.support)), now: false,
        });
        group = [];
    };
    for (const w of wins) {
        if (group.length && w.i > group[group.length - 1].j + 1) {close();}
        group.push(w);
    }
    close();
    return out;
}

/** a beats b: a clearly higher mean; on a near tie the longer, then the earlier stretch */
const beats = (a: DayBest, b: DayBest) => {
    if (Math.abs(a.rating - b.rating) > WINDOW.tie) {return a.rating > b.rating;}
    const [la, lb] = [a.end - a.start, b.end - b.start];
    return la !== lb ? la > lb : a.start < b.start;
};

/** The best stretch between two times over all of the spot's sports (from the hour that is on now) */
export function bestIn(models: SportModel[], hours: Hour[], from: number, to: number, now = Date.now()): DayBest | null {
    const list = hours.filter(h => h.ts + HOUR / 2 > Math.max(from, now) && h.ts <= to);
    let best: DayBest | null = null;
    for (const m of models) {
        for (const run of runs(list)) {
            for (const s of stretches(m, run)) {if (!best || beats(s, best)) {best = s;}}
        }
    }
    return best && { ...best, now: best.start <= now };
}

/** The rest of today */
export const bestToday = (models: SportModel[], hours: Hour[], now = Date.now()): DayBest | null => {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return bestIn(models, hours, now, end.getTime(), now);
};

/** The next days (tomorrow on), each with its best stretch */
export function nextDays(models: SportModel[], hours: Hour[], days = 5, now = Date.now()): { day: number; best: DayBest | null }[] {
    const out: { day: number; best: DayBest | null }[] = [];
    const d0 = new Date(now);
    d0.setHours(0, 0, 0, 0);
    for (let k = 1; k <= days; k++) {
        const a = new Date(d0);
        a.setDate(a.getDate() + k);
        const b = new Date(a);
        b.setHours(23, 59, 59, 999);
        if (!hours.some(h => h.ts >= a.getTime() && h.ts <= b.getTime())) {break;}
        out.push({ day: a.getTime(), best: bestIn(models, hours, a.getTime(), b.getTime(), now) });
    }
    return out;
}
