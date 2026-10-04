/*
 * Style Lab preview: talks to the lab around it.
 * The lab sends the design while you edit ("design"), asks for a screen ("goto") and turns "click to edit" on or off ("pick").
 * In click-to-edit mode a click in Spotlog doesn't act: it tells the lab which part you clicked and which words it shows.
 */
(() => {
  const toLab = msg => { try { window.parent.postMessage({ source: 'spotlog-preview', ...msg }, '*'); } catch (e) { /* no lab around */ } };
  let pending = null; // what the lab sent before Spotlog was ready
  window.__spotlogDesignHost = {
    ready() {
      const api = window.__spotlogDesign;
      if (pending) { if (pending.design) api.apply(pending.design); if (pending.goto) api.goto(pending.goto); pending = null; }
      toLab({ type: 'ready', phone: matchMedia('(max-width: 760px)').matches });
    },
  };
  window.addEventListener('message', e => {
    if (e.source !== window.parent) return;
    const d = e.data || {};
    const api = window.__spotlogDesign;
    if (d.type === 'design') { if (api) api.apply(d); else (pending = pending || {}).design = d; }
    if (d.type === 'goto') { if (api) api.goto(d.where); else (pending = pending || {}).goto = d.where; }
    if (d.type === 'pick') setPick(!!d.on);
  });

  /* ---------- click to edit ---------- */
  // what you can click, most specific first: [selector, name shown in the lab, settings it uses]
  const PARTS = [
    ['.sl-pop .sl-acts button:first-child', 'Card on the map: main button', ['primaryBg', 'primaryText']],
    ['.sl-pop .sl-nav button, .sl-pop .sl-acts button', 'Card on the map: buttons', ['popupBtnBg', 'popupBtnText', 'popupSub']],
    ['.sl-t', 'Forecast tiles', ['@wind', 'windText', 'dirTile', 'wavesTile']],
    ['.sl-b, .t-tag .tag:not(.ghost), .badge', 'Rating guess', ['@guesses']],
    ['.sl-pop', 'Card on the map', ['popupBg', 'popupText', 'popupSub']],
    ['.spotlog-pin.active', 'Selected spot on the map', ['activeBg', 'activeText', 'activeDot', 'goodStyle', 'lightFrom']],
    ['.spotlog-pin', 'Spot on the map', ['pinBg', 'pinText', 'pinDot', 'goodStyle', 'goodWord', 'lightFrom']],
    ['.spotlog-cdot', 'Spot dot (zoomed out)', ['compactDot', 'compactSize', 'compactRing', 'compactRingColor', 'compactRingWidth', 'compactBelow']],
    ['.spotlog-heat, .spotlog-tip', 'Sessions on the map', ['sessStyle', 'sessColor', 'sessCore', 'sessCoreRing', 'sessSize', 'sessGrow', 'sessAlpha', 'sessAlphaGrow', 'tipBg', 'tipText']],
    ['.spotlog-dot, .spotlog-route-label, .mock-line', 'GPS route', ['routeColor', 'routeWidth', 'casingColor', 'casingWidth', 'casingAlpha', 'startFill', 'startBorder', 'endFill', 'endBorder', 'routeLabel']],
    ['.toast .undo', 'Undo button', ['undoBg', 'toastBg']],
    ['.toast', 'Message', ['toastBg', 'toastText', 'undoBg']],
    ['.btn.primary, .tw-actions .done', 'Main button', ['primaryBg', 'primaryText', 'radiusButton']],
    ['.link.danger, .mini.danger', 'Delete link', ['dangerText', 'dangerLine']],
    ['.btn.ghost, .mini, .coffee, .tw-actions .clear', 'Outline button', ['ghostLine', 'ghostText', 'radiusButton']],
    ['.link, .mlink', 'Link', ['linkText']],
    ['.act, .mact', 'Big action button', ['actBg', 'actLine', 'actText', 'actSub', 'actIcon', 'uHoverBg', 'uHoverLine', 'radiusButton']],
    ['.rate, .dot, .cal .dots i, .cal .r', 'Session ratings', ['@ratings']],
    ['.set .sw, .switch', 'Switch', ['switchOn', 'switchOff', 'switchKnob']],
    ['.tabs button, .seg button, .mtabs button, .viewtog button, .models-pick button, .units', 'Tabs and options', ['tabsBg', 'tabText', 'selBg', 'selText', 'radiusButton', 'radiusSmall']],
    ['.chip, .dir', 'Chip', ['chipLine', 'chipText', 'chipOnBg', 'chipOnText', 'radiusChip']],
    ['.tw-pop', 'Time picker', ['wheelBg', 'wheelLine', 'wheelText', 'wheelQuiet']],
    ['.field-btn, input, textarea', 'Field', ['inputBg', 'inputLine', 'inputText', 'radiusButton']],
    ['.cal', 'Calendar', ['uCard', 'uLine', 'uText', 'uSub', 'tabText', 'calToday', 'selBg', 'selText']],
    ['.snap .model', 'Model tag', ['modelBg', 'modelText']],
    ['.snap .cell.light', 'Wind direction tile', ['dirTile', 'windText']],
    ['.snap .cell.blue', 'Waves tile', ['wavesTile', 'windText']],
    ['.snap .models .best', 'Closest model', ['bestBg', 'bestText']],
    ['.snap .cell, span.sw', 'Wind colours', ['@wind', 'windText']],
    ['.snap, .snapless, .suggest', 'Light card', ['lightBg', 'lightText', 'lightSub', 'lightLine', 'radiusCard']],
    ['.tag.green', '“Match” tag', ['matchBg', 'matchText']],
    ['.tag.ghost', 'Quiet tag', ['ghostTagLine', 'uSub']],
    ['.tile', 'Spot tile', ['tileBg', 'tileLine', 'radiusCard']],
    ['.del', 'Swipe to delete', ['deleteBg', 'deleteText']],
    ['.wordmark', 'Wordmark', ['wordmarkSize', 'uText']],
    ['.sl-star, .star', 'Pixel star', ['star']],
    ['.card, .opt', 'Card', ['uCard', 'uLine', 'uText', 'uSub', 'radiusCard']],
    ['.spotlog, .mwrap', 'Panel', ['uGround', 'uText', 'uSub', 'uQuiet', 'uOutline', 'textSize', 'titleSize', 'panelGap']],
  ];
  const SEL = PARTS.map(p => p[0]).join(', ');
  let picking = false, hoverEl = null;
  const style = document.createElement('style');
  style.textContent = '.sl-pick-on, .sl-pick-on * { cursor: crosshair !important; } .sl-pick-hover { outline: 2px solid #d49500 !important; outline-offset: 1px !important; }';
  document.head.appendChild(style);
  const partOf = el => { for (const p of PARTS) { const hit = el.closest && el.closest(p[0]); if (hit) return { el: hit, name: p[1], keys: p[2] }; } return null; };
  const textOf = el => {
    const out = [];
    for (let n = el, i = 0; n && i < 4 && n.nodeType === 1; n = n.parentElement, i++) {
      if (n.matches && n.matches('input, textarea') && n.placeholder) out.push(n.placeholder);
      const t = (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim();
      if (t && t.length <= 260 && !out.includes(t)) out.push(t);
    }
    return out;
  };
  function setPick(on) {
    picking = on;
    document.documentElement.classList.toggle('sl-pick-on', on);
    if (!on && hoverEl) { hoverEl.classList.remove('sl-pick-hover'); hoverEl = null; }
  }
  const swallow = e => { if (!picking) return; if (e.target.closest && e.target.closest(SEL)) { e.preventDefault(); e.stopPropagation(); } };
  ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup'].forEach(t => document.addEventListener(t, swallow, { capture: true, passive: false }));
  document.addEventListener('click', e => {
    if (!picking) return;
    const part = partOf(e.target);
    if (!part) return;
    e.preventDefault(); e.stopPropagation();
    toLab({ type: 'picked', name: part.name, keys: part.keys, texts: textOf(e.target) });
  }, true);
  document.addEventListener('mouseover', e => {
    if (!picking) return;
    const part = partOf(e.target);
    const el = part ? part.el : null;
    if (el === hoverEl) return;
    if (hoverEl) hoverEl.classList.remove('sl-pick-hover');
    hoverEl = el;
    if (el) el.classList.add('sl-pick-hover');
  });
})();
