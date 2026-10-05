export type Dir8 = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface Spot {
    id: string;
    name: string;
    lat: number;
    lon: number;
    place?: string;
    sports: string[];
    /** Wind directions (where the wind comes FROM) that work at this spot */
    dirs: Dir8[];
    /** Workable wind range, always stored in m/s */
    min: number;
    max: number;
    /** true when the user said "I don't know yet" — Spotlog will suggest dirs/range from sessions */
    windUnknown?: boolean;
    created: number;
    /** ranges you set yourself, per sport and condition (they win over what spotlog learns) */
    ranges?: Record<string, Partial<Record<string, { lo?: number; hi?: number; dirs?: Dir8[] }>>>;
    /** the model this spot learns and recommends from when ECMWF has no forecast here (chosen once); unset = ECMWF */
    recommendationModel?: string;
}

/** Value of one forecast model at the snapshot time (all SI: m/s, °C) */
export interface ModelValue {
    model: string;
    ts: number;
    wind: number | null;
    gust: number | null;
    dir: number | null;
    temp: number | null;
    /** rain in mm for the time step (newer forecasts only) */
    rain?: number | null;
}

export interface WaveValue {
    model: string;
    waves: number | null;
    wavesPeriod: number | null;
    wavesPower: number | null;
    wavesDir: number | null;
    swell1: number | null;
    swell1Period: number | null;
    swell1Dir: number | null;
}

export interface Snapshot {
    /** Invalid imported forecast content stays in the diary but never teaches. */
    forecastInvalid?: boolean;
    id: string;
    spotId: string | null;
    lat: number;
    lon: number;
    /** The forecast time the snapshot is for (the Windy timeline time) */
    ts: number;
    /** When the snapshot was taken */
    savedAt: number;
    /** Model that was active on the map when saving */
    primary: string;
    models: ModelValue[];
    waves: WaveValue | null;
    note?: string;
    /**
     * The whole day around `ts` (hourly-ish, as the models provide it), so the values can be
     * re-read for any time of that day — e.g. when a session is logged later for 14:00–17:00.
     */
    series?: DaySeries;
}

export interface DaySeries {
    ts: number[];
    /** per model: arrays aligned with ts (m/s, degrees, °C) */
    models: Record<string, { wind: (number | null)[]; gust: (number | null)[]; dir: (number | null)[]; temp: (number | null)[]; rain?: (number | null)[] }>;
    waves: {
        model: string;
        waves: (number | null)[]; wavesPeriod: (number | null)[]; wavesPower: (number | null)[]; wavesDir: (number | null)[];
        swell1: (number | null)[]; swell1Period: (number | null)[]; swell1Dir: (number | null)[];
    } | null;
    /** high and low tide times around the saved day, when Windy has a tide forecast there */
    tide?: { highs: number[]; lows: number[]; highsM?: number[]; lowsM?: number[] };
}

export interface Track {
    /** [lat, lon] pairs, downsampled */
    points: [number, number][];
    start: number | null;
    end: number | null;
    distanceKm: number;
    durationMin: number;
    /** m/s */
    maxSpeed: number | null;
    source: string;
}

export interface Session {
    id: string;
    /** null = not linked to a spot yet (can be added later) */
    spotId: string | null;
    lat?: number;
    lon?: number;
    snapshotId: string | null;
    date: number;
    rating: number;
    /** "Checked, not worth it": a quick log of a day you didn't go (teaches spotlog what doesn't work) */
    checked?: boolean;
    /** which of the spot's sports this session was (spots with one sport: that one) */
    sport?: string | null;
    gearIds?: string[];
    /** free-text gear */
    gear: string;
    start: string;
    end: string;
    notes: string;
    track?: Track | null;
    /** time zone the session was logged in (IANA, e.g. Europe/Prague) */
    tz?: string;
}

export interface Gear {
    id: string;
    name: string;
    kind: string;
    /** Windsurf, Surf, Kite, Wing (older gear may have none) */
    sport?: string;
}

export type WindUnit = 'ms' | 'kt' | 'kmh' | 'mph' | 'bft';
export type HeightUnit = 'm' | 'ft';
export type TempUnit = 'C' | 'F';

export interface Settings {
    wind: WindUnit;
    height: HeightUnit;
    temp: TempUnit;
    allModels: boolean;
    /** models to save when allModels is off */
    models: string[];
    /** optional layers saved in a snapshot (wind + gusts + direction are always saved) */
    layers: string[];
    /** what Spotlog draws on the Windy map */
    mapSpots: boolean;
    mapSessions: boolean;
    /** spots on the home screen: tiles or a compact list */
    spotView: 'tiles' | 'list';
    /** phones: try the new bar + sheet layout (off = the panel under the timeline, as in 0.6) */
    phoneSheet: boolean;
    /** the welcome for new users was seen (it shows once) */
    welcomed: boolean;
    /** "What works here for you" folded open on spot pages */
    worksOpen: boolean;
    /** the order of the spots on the home screen (ids, set by dragging); spots not in it follow in the diary's order */
    spotOrder: string[];
}

export interface SpotlogData {
    version: 1;
    spots: Spot[];
    snapshots: Snapshot[];
    sessions: Session[];
    gear: Gear[];
    settings: Settings;
    /** last local change (ms), used by account sync */
    updatedAt?: number;
    /** Per-entity last edit; legacy entities fall back to the document timestamp. */
    revisions?: Record<string, number>;
    /** Last settings edit, independent of diary entities. */
    settingsAt?: number;
    /** ids deleted on this device (id -> ms), so a sync doesn't bring them back; pruned after 90 days */
    deleted?: Record<string, number>;
    /** ids brought back (upload, undo) after a delete (id -> ms): newer than the delete wins, also in other tabs and on other devices */
    revived?: Record<string, number>;
}
