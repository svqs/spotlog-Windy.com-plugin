import { escapeHtml } from './html';
import { THEME, guessColours, lightsUp } from '../theme';
import { w, t } from '../copy';
import { fmtDay, fmtTime, ratingBg } from '../wind';
import type { DayBest } from '../learn/windows';
import type { Session, Spot } from '../types';

export function sessionTip(sessions: Session[], title: string): string {
    const head = `<b>${escapeHtml(title)}</b>${sessions.length > 1 ? ` · ${escapeHtml(t('tipSessions', { n: sessions.length }))}` : ''}`;
    const rows = sessions.slice(0, 5).map(session => `<span><i style="background:${ratingBg(session.rating)}"></i>${escapeHtml(fmtDay(session.date))} · ${escapeHtml(w('rate' + session.rating))}</span>`).join('');
    return head + rows + (sessions.length > 5 ? `<small>${escapeHtml(t('tipMore', { n: sessions.length - 5 }))}</small>` : '');
}

export function spotPin(spot: Spot, best: DayBest | null, active: boolean, compact: boolean, tooltip: string): string {
    const tip = tooltip ? `<div class="spotlog-tip">${tooltip}</div>` : '';
    const level = best?.level ?? 0;
    const good = level > 0 && lightsUp(level);
    const [background, foreground] = good ? guessColours(level) : ['', ''];
    const word = good && THEME.goodWord ? `<em>${escapeHtml(w('rate' + level))}${best && !best.now ? ' ' + escapeHtml(fmtTime(best.start)) : ''}</em>` : '';
    if (compact) {return `<div class="spotlog-cdot" style="background:${good ? background : 'var(--sl-compact-dot)'}">${tip || `<div class="spotlog-tip"><b>${escapeHtml(spot.name)}</b></div>`}</div>`;}
    if (active) {return `<div class="spotlog-pin active"><i style="background:${good ? background : 'var(--sl-active-dot)'}"></i>${escapeHtml(spot.name)}${word}${tip}</div>`;}
    let style = ''; let dot = '';
    if (good && THEME.goodStyle === 'pin') {style = `background:${background};color:${foreground};`; dot = foreground;}
    if (good && THEME.goodStyle === 'dot') {dot = background;}
    if (good && THEME.goodStyle === 'outline') {style = `box-shadow:0 0 0 2px ${background}, 0 2px 8px rgba(0,0,0,.35);`; dot = background;}
    return `<div class="spotlog-pin${good ? ' good' : ''}" style="${style}"><i${dot ? ` style="background:${dot}"` : ''}></i>${escapeHtml(spot.name)}${word}${tip}</div>`;
}

export function heatPin(style: string, core: string, tooltip: string): string {
    return `<div class="spotlog-heat${core}" style="${style}"><div class="spotlog-tip">${tooltip}</div></div>`;
}
