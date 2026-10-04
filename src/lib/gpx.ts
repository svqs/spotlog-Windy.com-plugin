import { distanceKm } from './geo';
import type { Track } from './types';

export class TrackError extends Error {
    constructor(public readonly code: string) {super(code);}
}

interface Pt { lat: number; lon: number; t: number | null }

const validTime = (value: string | null): number | null => { const time = Date.parse(value || ''); return Number.isFinite(time) ? time : null; };

const parseGpx = (doc: Document): Pt[] =>
    Array.from(doc.getElementsByTagName('trkpt')).map(n => ({
        lat: parseFloat(n.getAttribute('lat') || ''),
        lon: parseFloat(n.getAttribute('lon') || ''),
        t: n.getElementsByTagName('time')[0] ? validTime(n.getElementsByTagName('time')[0].textContent) : null,
    }));

const parseTcx = (doc: Document): Pt[] =>
    Array.from(doc.getElementsByTagName('Trackpoint'))
        .map(n => {
            const lat = n.getElementsByTagName('LatitudeDegrees')[0]?.textContent;
            const lon = n.getElementsByTagName('LongitudeDegrees')[0]?.textContent;
            const t = n.getElementsByTagName('Time')[0]?.textContent;
            return { lat: parseFloat(lat || ''), lon: parseFloat(lon || ''), t: t ? validTime(t) : null };
        });

/** Reads a GPX or TCX file (what Garmin Connect, Strava & co. export) into a compact track */
export const readTrack = async (file: File): Promise<Track> => {
    const name = file.name.toLowerCase();
    if (file.size > 40 * 1024 * 1024) {throw new TrackError('trackTooLarge');}
    if (name.endsWith('.fit')) {
        throw new TrackError('trackFitUnsupported');
    }
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) {throw new TrackError('trackUnreadable');}
    let pts = parseGpx(doc);
    if (!pts.length) {pts = parseTcx(doc);}
    pts = pts.filter(p => isFinite(p.lat) && Math.abs(p.lat) <= 90 && isFinite(p.lon) && Math.abs(p.lon) <= 180);
    if (pts.length < 2) {throw new TrackError('trackNoPoints');}

    let dist = 0;
    let maxSpeed: number | null = null;
    // top speed over ~10 s windows so single GPS spikes don't count
    let wStart = 0;
    for (let i = 1; i < pts.length; i++) {
        dist += distanceKm(pts[i - 1], pts[i]);
        const a = pts[wStart];
        const b = pts[i];
        if (a.t !== null && b.t !== null && b.t - a.t >= 10e3) {
            let d = 0;
            for (let k = wStart + 1; k <= i; k++) {d += distanceKm(pts[k - 1], pts[k]);}
            const v = (d * 1000) / ((b.t - a.t) / 1000);
            if (v < 40 && (maxSpeed === null || v > maxSpeed)) {maxSpeed = v;}
            wStart = i;
        }
    }
    const t0 = pts.find(p => p.t !== null)?.t ?? null;
    const t1 = [...pts].reverse().find(p => p.t !== null)?.t ?? null;
    const step = Math.max(1, Math.ceil(pts.length / 400));
    const points = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map(p => [p.lat, p.lon] as [number, number]);
    return {
        points,
        start: t0,
        end: t1,
        distanceKm: Math.round(dist * 100) / 100,
        durationMin: t0 !== null && t1 !== null ? Math.round((t1 - t0) / 60e3) : 0,
        maxSpeed,
        source: file.name,
    };
};
