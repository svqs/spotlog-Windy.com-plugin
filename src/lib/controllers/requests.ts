/** Bounded request/result cache. Public forecast reuse is separate from account-owned component state. */
export function createRequestCache<T>(ttl: number, limit: number) {
    const entries = new Map<string, { at: number; promise: Promise<T> }>();
    let generation = 0;
    return {
        get(key: string, fetcher: () => Promise<T>): Promise<T> {
            const now = Date.now();
            entries.forEach((entry, id) => {if (now - entry.at >= ttl) {entries.delete(id);}});
            const cached = entries.get(key);
            if (cached) {return cached.promise;}
            const captured = generation;
            const promise = Promise.resolve().then(fetcher).catch(error => {
                if (captured === generation && entries.get(key)?.promise === promise) {entries.delete(key);}
                throw error;
            });
            entries.set(key, { at: now, promise });
            while (entries.size > limit) {entries.delete(entries.keys().next().value as string);}
            return promise;
        },
        clear(): void {generation++; entries.clear();},
        evict(key: string): void {entries.delete(key);},
        get size(): number {return entries.size;},
    };
}
