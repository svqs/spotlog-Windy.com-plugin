import type { Dir8 } from '../lib/types';

export interface SpotForm {
        id?: string; name: string; place: string; lat: number; lon: number; sports: string[];
        dirs: Dir8[]; dMin: number; dMax: number; windUnknown: boolean; created?: number;
    }
