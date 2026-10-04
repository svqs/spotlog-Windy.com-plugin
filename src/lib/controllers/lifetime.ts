/** Account/component ownership and named latest-operation guards, independent of UI or transports. */
export function createLifetime() {
    let generation = 0;
    let disposed = false;
    const operations = new Map<string, number>();
    return {
        capture(scope?: string): () => boolean {
            const captured = generation;
            const operation = scope ? (operations.get(scope) || 0) + 1 : 0;
            if (scope) {operations.set(scope, operation);}
            return () => !disposed && captured === generation && (!scope || operations.get(scope) === operation);
        },
        invalidate(): void {generation++; operations.clear();},
        dispose(): void {disposed = true; generation++; operations.clear();},
    };
}
