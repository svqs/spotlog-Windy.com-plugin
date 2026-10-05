import { escapeHtml } from './html';
import { w } from '../copy';
import { forecastDisplay } from '../forecast-display';
import type { Spot, ModelValue, WaveValue, Settings } from '../types';

interface PopupDisplay {
    spot: Spot;
    now: { wind: ModelValue | null; waves: WaveValue | null } | null;
    loading: boolean;
    mobile: boolean;
    /** desktop's hover card: just the conditions, no buttons */
    hover?: boolean;
    many: boolean;
    settings: Settings;
    badge: string;
    colours: [string, string];
    best: { label: string; range: string } | null;
}

/** Presentation only: callers provide the already-derived rating and best stretch. */
export function popupHtml(display: PopupDisplay): string {
    const { spot, now, loading, mobile, hover, many, settings, badge, colours, best } = display;
    const wind = now?.wind;
    const values = forecastDisplay(wind ?? null, now?.waves ?? null, settings);
    const label = (key: string) => escapeHtml(w(key));
    const tile = (title: string, value: string, background: string, unit = '') =>
        `<div class="sl-t" style="background:${background}"><span>${title}</span><b>${escapeHtml(value)}</b><small>${escapeHtml(unit) || '&nbsp;'}</small></div>`;
    const navigation = mobile ? `<span class="sl-nav">${many ? `<button data-act="prev" aria-label="${label('previousSpot')}">‹</button><button data-act="next" aria-label="${label('nextSpot')}">›</button>` : ''}<button class="sl-x" data-act="close" aria-label="${label('close')}">✕</button></span>` : '';
    let content = `<div class="sl-pop"><div class="sl-h"><span><b>${escapeHtml(spot.name)}</b><small>${label('cardNow')}</small></span>${navigation}</div>`;
    if (wind) {
        content += `<div class="sl-tiles">${tile(label('fcWind'), values.wind, values.windBackground, values.windUnit)}${tile(label('fcGusts'), values.gust, values.gustBackground, values.windUnit)}${tile(label('fcFrom'), values.direction, 'var(--sl-dirTile, #e9e8e3)')}${now?.waves ? tile(label('fcWaves'), values.waves, 'var(--sl-wavesTile, #dbe6f2)', settings.height) : ''}</div>`;
        content += `<small>${escapeHtml(values.temperature)}</small>`;
    } else {content += `<small>${(loading ? label('cardLoading') : label('fcEmpty'))}</small>`;}
    if (badge) {content += `<span class="sl-b" style="background:${colours[0]};color:${colours[1]}">${escapeHtml(badge)}</span>`;}
    if (best) {content += `<small class="sl-best">${label('bestToday')}: <b>${escapeHtml(best.label)}</b> ${escapeHtml(best.range)}</small>`;}
    if (mobile) {content += `<div class="sl-acts"><button data-act="snap">${label('cardSave')}</button><button data-act="log">${label('cardLog')}</button><button data-act="open">${label('cardDetails')}</button></div>`;}
    else if (!hover) {content += `<button class="sl-detail" data-act="detail">${label('cardPointForecast')}</button>`;}
    return content + '</div>';
}
