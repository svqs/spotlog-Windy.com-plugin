import { createRequestCache } from './requests';
import type { Hour } from '../predict';
import type { ModelValue, WaveValue } from '../types';
import type { TideResult } from '../forecast';

export interface Conditions { wind: ModelValue | null; waves: WaveValue | null }
export interface Outlook { hours: Hour[]; pred: Record<string, number>; tide: TideResult }
interface ForecastSource {
    conditionsNow(lat: number, lon: number, model: string): Promise<Conditions>;
    hoursToday(lat: number, lon: number, model: string): Promise<Hour[]>;
    hoursBetween(lat: number, lon: number, from: number, to: number, model: string): Promise<Hour[]>;
    predictability(lat: number, lon: number, model: string): Promise<Record<string, number>>;
    tideToday(lat: number, lon: number): Promise<TideResult>;
    availableModels(lat: number, lon: number): Promise<string[]>;
}
/** Host transport is injected. Consumers guard account/form identity before accepting a public result. */
export function createForecastController(source: ForecastSource) {
    const conditions = createRequestCache<{ now: Conditions; hours: Hour[] | null }>(20 * 60e3, 256);
    const models = createRequestCache<string[]>(20 * 60e3, 128);
    const outlook = createRequestCache<Outlook>(10 * 60e3, 128);
    return {
        models(lat: number, lon: number) {
            const key = `${lat}|${lon}`;
            return models.get(key, () => source.availableModels(lat, lon)).then(result => {
                if (!result.length) {models.evict(key);} return result;
            });
        },
        now(lat: number, lon: number, model: string, includeHours: boolean) {
            const key = `${lat}|${lon}|${model}|${includeHours}`;
            return conditions.get(key, async () => {
                const [now, hours] = await Promise.all([source.conditionsNow(lat, lon, model), includeHours ? source.hoursToday(lat, lon, model) : Promise.resolve(null)]);
                return { now, hours };
            }).then(result => {if (!result.now.wind) {conditions.evict(key);} return result;});
        },
        outlook(lat: number, lon: number, model: string, premium: boolean) {
            const key = `${lat}|${lon}|${model}|${premium}`;
            return outlook.get(key, async () => {
                const from = Date.now();
                const [hours, pred, tide] = await Promise.all([source.hoursBetween(lat, lon, from, from + 6 * 864e5, model), source.predictability(lat, lon, model), source.tideToday(lat, lon)]);
                return { hours, pred, tide };
            }).then(result => {if (!result.hours.length) {outlook.evict(key);} return result;});
        },
        clearOutlook() {outlook.clear();},
        clear() {conditions.clear(); models.clear(); outlook.clear();},
        get sizes() {return { conditions: conditions.size, models: models.size, outlook: outlook.size };},
    };
}
