export interface MarkerDescriptor {
    id: string;
    lat: number;
    lon: number;
    html: string;
    glow?: boolean;
    click?: () => void;
}
interface Marker { remove(): void }

/** Reconcile only changed visuals; listeners always use the latest entity callback. */
export function createMarkerLayer(create: (descriptor: MarkerDescriptor, click: () => void) => Marker) {
    const entries = new Map<string, { marker: Marker; signature: string; descriptor: MarkerDescriptor }>();
    return {
        reconcile(descriptors: MarkerDescriptor[]): void {
            const ids = new Set(descriptors.map(descriptor => descriptor.id));
            for (const [id, entry] of entries) {if (!ids.has(id)) {entry.marker.remove(); entries.delete(id);}}
            for (const descriptor of descriptors) {
                const signature = JSON.stringify([descriptor.lat, descriptor.lon, descriptor.html, descriptor.glow]);
                const existing = entries.get(descriptor.id);
                if (existing?.signature === signature) {existing.descriptor = descriptor; continue;}
                existing?.marker.remove();
                const entry = { marker: null as unknown as Marker, signature, descriptor };
                entry.marker = create(descriptor, () => entry.descriptor.click?.());
                entries.set(descriptor.id, entry);
            }
        },
        clear(): void {entries.forEach(entry => entry.marker.remove()); entries.clear();},
    };
}
