/**
 * The order of the spots on the home screen (tiles and list), set by dragging them.
 * Stored as ids in settings.spotOrder; spots not in it (new ones) follow in the diary's own order.
 */
export function orderSpots<T extends { id: string }>(spots: T[], order: string[] | undefined): T[] {
    if (!order?.length) {return spots;}
    const rank = new Map(order.map((id, i) => [id, i]));
    return spots
        .map((spot, i) => ({ spot, key: rank.has(spot.id) ? (rank.get(spot.id) as number) : order.length + i }))
        .sort((a, b) => a.key - b.key)
        .map(x => x.spot);
}

/** The ids with `id` moved to position `to` (0 = first) */
export function moveId(ids: string[], id: string, to: number): string[] {
    const from = ids.indexOf(id);
    if (from < 0) {return ids;}
    const next = ids.filter(x => x !== id);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, id);
    return next;
}
