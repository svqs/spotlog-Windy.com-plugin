import type { Spot } from '../types';

/** Editable fields never replace metadata belonging to an existing spot. */
export function editSpot(existing: Spot | undefined, editable: Spot): Spot {
    if (!existing) {return editable;}
    const { name, place, lat, lon, sports, dirs, min, max, windUnknown } = editable;
    return { ...existing, name, place, lat, lon, sports, dirs, min, max, windUnknown };
}

export function replaceEntity<T extends { id: string }>(items: T[], edited: T): T[] {
    return items.some(item => item.id === edited.id)
        ? items.map(item => item.id === edited.id ? edited : item)
        : [...items, edited];
}
