import { THEME } from '../theme';
import { fmtDistance } from '../units';
import { escapeHtml } from './html';
import type { Track, Settings } from '../types';

interface Layer { remove(): void }
interface Route extends Layer { getBounds(): unknown }
interface TrackHost {
    line(points: Track['points'], options: { color: string; weight: number; opacity: number }): Route;
    point(lat: number, lon: number, html: string): Layer;
    fit(bounds: unknown): void;
}
/** Tracks have their own lifecycle; the root only supplies the Leaflet transport. */
export function createTrackLayer(host: TrackHost) {
    let layers: Layer[] = [];
    return {
        draw(track: Track | null, settings: Settings, fit = false): void {
            layers.forEach(layer => layer.remove()); layers = [];
            if (!track?.points.length) {return;}
            try {
                const casing = host.line(track.points, { color: THEME.casingColor, weight: THEME.routeWidth + THEME.casingWidth * 2, opacity: THEME.casingWidth > 0 ? THEME.casingAlpha : 0 });
                layers.push(casing);
                const route = host.line(track.points, { color: THEME.routeColor, weight: THEME.routeWidth, opacity: 1 });
                layers.push(route);
                const first = track.points[0]; const last = track.points[track.points.length - 1];
                layers.push(host.point(first[0], first[1], '<div class="spotlog-dot start"></div>'));
                layers.push(host.point(last[0], last[1], '<div class="spotlog-dot end"></div>'));
                let far = first; let distance = -1;
                for (const point of track.points) {
                    const next = (point[0] - first[0]) ** 2 + (point[1] - first[1]) ** 2;
                    if (next > distance) {distance = next; far = point;}
                }
                const hours = Math.floor(track.durationMin / 60);
                const minutes = String(Math.round(track.durationMin % 60)).padStart(2, '0');
                layers.push(host.point(far[0], far[1], `<div class="spotlog-route-label">${escapeHtml(fmtDistance(track.distanceKm, settings.height))} · ${hours}:${minutes} h</div>`));
                if (fit) {host.fit(route.getBounds());}
            } catch (error) {console.info('[spotlog] could not draw the track', error);}
        },
    };
}
