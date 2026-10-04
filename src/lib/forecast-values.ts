import type { ModelValue, WaveValue } from './types';

/** One mapping for live and stored columns; readers retain their own coverage/freshness policy. */
export function weatherValue(model: string, ts: number, read: (column: string) => number | null): ModelValue {
    return { model, ts, wind: read('wind'), gust: read('gust'), dir: read('dir'), temp: read('temp'), rain: read('rain') };
}
export function waveValue(model: string, read: (column: string) => number | null): WaveValue {
    return { model, waves: read('waves'), wavesPeriod: read('wavesPeriod'), wavesPower: read('wavesPower'), wavesDir: read('wavesDir'), swell1: read('swell1'), swell1Period: read('swell1Period'), swell1Dir: read('swell1Dir') };
}
export function waveHour(value: WaveValue) {
    return { waves: value.waves, period: value.wavesPeriod, wavesDir: value.wavesDir, power: value.wavesPower,
        swell: value.swell1, swellPeriod: value.swell1Period, swellDir: value.swell1Dir };
}
