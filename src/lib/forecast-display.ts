import { dirName } from './directions';
import { windColor } from './wind';
import { fmtWind0, fmtHeight, fmtTemp, windLabel } from './units';
import type { ModelValue, WaveValue, Settings } from './types';

/** Shared formatted values; Svelte and Leaflet retain their own markup and copy labels. */
export function forecastDisplay(wind: ModelValue | null, waves: WaveValue | null, settings: Settings) {
    return {
        wind: fmtWind0(wind?.wind ?? null, settings.wind), gust: fmtWind0(wind?.gust ?? null, settings.wind),
        windBackground: windColor(wind?.wind ?? null), gustBackground: windColor(wind?.gust ?? null),
        windUnit: windLabel(settings.wind), direction: dirName(wind?.dir ?? null), directionAngle: (wind?.dir ?? 0) + 180,
        waves: fmtHeight(waves?.waves ?? null, settings.height), heightUnit: settings.height,
        temperature: fmtTemp(wind?.temp ?? null, settings.temp),
    };
}
