import type { Dir8 } from './types';

export const DIRS: Dir8[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Degrees (wind FROM) to one of 16 compass names */
export const dirName = (deg: number | null): string => {
    if (deg === null) {
        return '–';
    }
    const names = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return names[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
};

export const dirsLabel = (dirs: Dir8[]): string => {
    if (!dirs.length) {
        return '';
    }
    if (dirs.length === 8) {
        return '';
    }
    // Group neighbouring sectors (the compass wraps around) into runs like "E–SE"
    const on = DIRS.map(d => dirs.includes(d));
    const startAt = on.findIndex((v, i) => v && !on[(i + 7) % 8]);
    const runs: string[] = [];
    for (let k = 0; k < 8; k++) {
        const i = (startAt + k) % 8;
        if (on[i] && !on[(i + 7) % 8]) {
            let j = i;
            while (on[(j + 1) % 8] && (j + 1) % 8 !== i) {j = (j + 1) % 8;}
            runs.push(i === j ? DIRS[i] : `${DIRS[i]}–${DIRS[j]}`);
        }
    }
    return runs.join(', ');
};

