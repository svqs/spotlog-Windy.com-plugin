// A tiny stand-in for windy.com so the real, compiled Spotlog plugin can run outside Windy.
// It fakes: the map + markers, singleclick, the timeline store, reverse geocoding and
// the point-forecast API (with slightly different numbers per model).

(function () {
    const listeners = {};
    const evented = () => {
        const subs = {};
        let id = 0;
        return {
            on(topic, cb) { id++; (subs[topic] = subs[topic] || []).push({ id, cb }); return id; },
            off(topicOrId, cb) {
                if (typeof topicOrId === 'number') {
                    Object.values(subs).forEach(l => { const i = l.findIndex(x => x.id === topicOrId); if (i > -1) l.splice(i, 1); });
                } else if (subs[topicOrId]) {
                    subs[topicOrId] = subs[topicOrId].filter(x => x.cb !== cb);
                }
            },
            emit(topic, ...args) { (subs[topic] || []).forEach(x => x.cb(...args)); },
        };
    };

    // ---- map projection over the Strait of Gibraltar ----
    const INIT = { north: 36.25, south: 35.85, west: -5.95, east: -5.35 };
    const BOUNDS = { ...INIT };
    const moveSubs = [];
    const mapEl = () => document.getElementById('map');
    const project = (lat, lon) => {
        const el = mapEl();
        return {
            x: ((lon - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * el.clientWidth,
            y: ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * el.clientHeight,
        };
    };
    const unproject = (x, y) => {
        const el = mapEl();
        return {
            lat: BOUNDS.north - (y / el.clientHeight) * (BOUNDS.north - BOUNDS.south),
            lon: BOUNDS.west + (x / el.clientWidth) * (BOUNDS.east - BOUNDS.west),
        };
    };

    const live = new Set();
    class Marker {
        constructor(latlng, opts) { this.latlng = latlng; this.opts = opts || {}; this.handlers = {}; }
        place() {
            const p = project(this.latlng.lat, this.latlng.lng);
            this.el.style.left = p.x + 'px';
            this.el.style.top = p.y + 'px';
        }
        addTo() {
            const el = document.createElement('div');
            el.className = 'mock-marker ' + (this.opts.icon?.className || 'pulse');
            el.innerHTML = this.opts.icon?.html || '<span class="pulse-dot"></span>';
            el.addEventListener('click', e => { e.stopPropagation(); (this.handlers.click || []).forEach(h => h(e)); });
            // like Leaflet: mouseover / mouseout on the marker; a marker in a pane gets that pane's z-index
            el.addEventListener('mouseenter', e => (this.handlers.mouseover || []).forEach(h => h(e)));
            el.addEventListener('mouseleave', e => (this.handlers.mouseout || []).forEach(h => h(e)));
            // (Leaflet's 700+ means above the cards; here cards are at 20)
            if (this.opts.pane && panes[this.opts.pane]) el.style.zIndex = Number(panes[this.opts.pane].style.zIndex) >= 700 ? '21' : '';
            mapEl().appendChild(el);
            this.el = el;
            this.place();
            live.add(this);
            return this;
        }
        on(ev, h) { (this.handlers[ev] = this.handlers[ev] || []).push(h); return this; }
        getElement() { return this.el || null; }
        remove() { this.el?.remove(); live.delete(this); return this; }
    }
    // map panes (Leaflet's createPane / getPane): only their z-index matters here; cards (popups) are at 20
    const panes = {};
    // ---- popups + polylines (the bits of Leaflet Spotlog uses) ----
    let openPopup = null;
    class Popup {
        constructor(opts) { this.opts = opts || {}; this.h = {}; }
        on(ev, f) { (this.h[ev] = this.h[ev] || []).push(f); return this; }
        setLatLng(ll) { this.ll = Array.isArray(ll) ? { lat: ll[0], lng: ll[1] } : ll; return this; }
        setContent(html) { this.html = html; const c = this.el?.querySelector('.leaflet-popup-content'); if (c) c.innerHTML = html; return this; }
        getElement() { return this.el || null; }
        place() { const p = project(this.ll.lat, this.ll.lng); this.el.style.left = p.x + 'px'; this.el.style.top = p.y + 'px'; }
        openOn() {
            if (openPopup && openPopup !== this && openPopup.opts.autoClose !== false) openPopup.remove();
            this.el?.remove();
            const el = document.createElement('div');
            el.className = 'mock-popup leaflet-popup ' + (this.opts.className || '');
            el.innerHTML = '<div class="leaflet-popup-content-wrapper"><div class="leaflet-popup-content">' + this.html + '</div></div>' + (this.opts.closeButton === false ? '' : '<button class="mock-popup-x" aria-label="Close">×</button>');
            el.addEventListener('click', e => e.stopPropagation());
            el.querySelector('.mock-popup-x')?.addEventListener('click', () => this.remove());
            mapEl().appendChild(el);
            this.el = el; this.place(); live.add(this); openPopup = this;
            return this;
        }
        remove() { const was = !!this.el?.isConnected; this.el?.remove(); live.delete(this); if (openPopup === this) openPopup = null; if (was) (this.h.remove || []).forEach(f => f()); return this; }
    }
    class Polyline {
        constructor(pts, opts) { this.pts = pts.map(p => Array.isArray(p) ? { lat: p[0], lng: p[1] } : p); this.opts = opts || {}; }
        place() {
            this.path.setAttribute('points', this.pts.map(p => { const q = project(p.lat, p.lng); return q.x + ',' + q.y; }).join(' '));
        }
        addTo() {
            const ns = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(ns, 'svg');
            svg.setAttribute('class', 'mock-line');
            const path = document.createElementNS(ns, 'polyline');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', this.opts.color || '#d49500');
            path.setAttribute('stroke-width', this.opts.weight || 3);
            path.setAttribute('stroke-linejoin', this.opts.lineJoin || 'round');
            path.setAttribute('stroke-linecap', this.opts.lineCap || 'round');
            path.setAttribute('stroke-opacity', this.opts.opacity ?? 1);
            svg.appendChild(path);
            mapEl().appendChild(svg);
            this.el = svg; this.path = path; this.place(); live.add(this);
            return this;
        }
        getBounds() {
            const lats = this.pts.map(p => p.lat), lngs = this.pts.map(p => p.lng);
            return { south: Math.min(...lats), north: Math.max(...lats), west: Math.min(...lngs), east: Math.max(...lngs) };
        }
        remove() { this.el?.remove(); live.delete(this); return this; }
    }
    window.addEventListener('resize', () => live.forEach(m => m.place()));
    window.L = { Marker, divIcon: o => o, popup: o => new Popup(o), polyline: (p, o) => new Polyline(p, o) };

    // ---- a very small pan/zoom so centerMap, fitBounds and GPS tracks can be seen properly ----
    // k = how many times wider than the initial view (1 = initial, 0.1 = zoomed in 10x)
    const view = { k: 1 };
    const setView = (lat, lon, k) => {
        k = Math.max(0.02, Math.min(1.6, k));
        const hw = (INIT.east - INIT.west) * k / 2, hh = (INIT.north - INIT.south) * k / 2;
        Object.assign(BOUNDS, { north: lat + hh, south: lat - hh, west: lon - hw, east: lon + hw });
        view.k = k;
        live.forEach(m => m.place());
        moveSubs.forEach(f => f(BOUNDS, view.k));
    };
    const centre = () => ({ lat: (BOUNDS.north + BOUNDS.south) / 2, lng: (BOUNDS.west + BOUNDS.east) / 2 });
    const flash = (lat, lon) => {
        const p = project(lat, lon);
        const el = document.createElement('div');
        el.className = 'mock-flash';
        el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
        mapEl().appendChild(el);
        setTimeout(() => el.remove(), 1400);
    };
    const leafletMap = {
        getCenter: centre,
        getZoom: () => Math.round(11 - Math.log2(view.k)),
        createPane: name => (panes[name] = panes[name] || { style: {} }),
        getPane: name => panes[name],
        on: (ev, f) => { if (ev === 'zoomend' || ev === 'moveend') moveSubs.push(f); },
        off: (ev, f) => { const i = moveSubs.indexOf(f); if (i >= 0) moveSubs.splice(i, 1); },
        fitBounds: (b, o) => {
            console.log('[W.map] fitBounds', b);
            const el = mapEl(), pad = (o && o.padding && o.padding[0]) || 0;
            const kx = (b.east - b.west) / (INIT.east - INIT.west) * el.clientWidth / Math.max(50, el.clientWidth - 2 * pad);
            const ky = (b.north - b.south) / (INIT.north - INIT.south) * el.clientHeight / Math.max(50, el.clientHeight - 2 * pad);
            setView((b.north + b.south) / 2, (b.west + b.east) / 2, Math.max(kx, ky, 0.02));
        },
    };
    const centerMap = c => {
        console.log('[W.map] centerMap', c);
        setView(c.lat, c.lon, c.zoom ? Math.pow(2, 11 - c.zoom) : view.k);
        flash(c.lat, c.lon);
    };

    // mouse wheel zooms around the cursor, dragging pans (a drag never counts as a map click)
    const attach = () => {
        const el = mapEl();
        if (!el) return;
        el.addEventListener('wheel', e => {
            if (e.target.closest('.top, .bar, .sb-top, .sb-bar, .banner, .mock-popup')) return;
            e.preventDefault();
            const r = el.getBoundingClientRect();
            const at = unproject(e.clientX - r.left, e.clientY - r.top);
            const f = Math.exp(Math.max(-0.5, Math.min(0.5, e.deltaY * 0.0025)));
            const k = Math.max(0.02, Math.min(1.6, view.k * f));
            const c = centre(), ratio = k / view.k;
            setView(at.lat + (c.lat - at.lat) * ratio, at.lon + (c.lng - at.lon) * ratio, k);
        }, { passive: false });
        let drag = null, panned = false;
        el.addEventListener('pointerdown', e => {
            if (e.button !== 0 || e.target.closest('.top, .bar, .banner, .mock-popup, .label, .mock-marker')) return;
            drag = { x: e.clientX, y: e.clientY, c: centre() }; panned = false;
        });
        window.addEventListener('pointermove', e => {
            if (!drag) return;
            const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            if (!panned && Math.hypot(dx, dy) < 5) return;
            panned = true;
            const lonPerPx = (BOUNDS.east - BOUNDS.west) / el.clientWidth, latPerPx = (BOUNDS.north - BOUNDS.south) / el.clientHeight;
            setView(drag.c.lat + dy * latPerPx, drag.c.lng - dx * lonPerPx, view.k);
            el.style.cursor = 'grabbing';
        });
        window.addEventListener('pointerup', () => { drag = null; el.style.cursor = ''; });
        el.addEventListener('click', e => { if (panned) { e.stopImmediatePropagation(); panned = false; } }, true);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach); else attach();

    // ---- timeline ----
    const store = evented();
    const now = new Date();
    now.setMinutes(0, 0, 0);
    // a logged-in Windy Premium user (Spotlog is for Premium members). Try store.set('user', null) or store.set('subscription', null).
    const state = {
        timestamp: +now + 3 * 3600e3, product: 'ecmwf', overlay: 'wind',
        user: { id: 12345, username: 'sophia', email: 'sophia@example.com' }, subscription: 'premium', userToken: 'mock-token-12345',
    };
    store.get = k => state[k];
    store.set = (k, v) => { state[k] = v; store.emit(k, v); };

    // ---- singleclick ----
    const singleclick = evented();

    // ---- fake point forecast ----
    const MODEL_OFFSET = { ecmwf: 0, gfs: -1.6, icon: 0.9, iconEu: 0.4, arome: -0.6 };
    const hash = (a, b) => Math.abs(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1;
    const series = (model, lat, lon) => {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const out = { ts: [], hour: [], isDay: [], wind: [], windGust: [], windDir: [], temperature: [], waves: [], wavesPeriod: [], wavesPower: [], wavesDir: [], swell1: [], swell1Period: [], swell1Dir: [] };
        const base = 6 + hash(lat, lon) * 4;
        for (let i = 0; i < 24 * 8; i++) {
            const ts = +start + i * 3600e3;
            const h = new Date(ts).getHours();
            const day = Math.floor(i / 24);
            const diurnal = Math.sin(((h - 9) / 24) * Math.PI * 2) * 2.4;
            const synoptic = Math.sin(day / 1.3) * 2.2;
            const w = Math.max(0.5, base + diurnal + synoptic + (MODEL_OFFSET[model] || 0) + Math.sin(i / 3.1) * 0.6);
            const levante = day % 5 < 3;
            out.ts.push(ts); out.hour.push(h); out.isDay.push(h >= 8 && h <= 20 ? 1 : 0);
            out.wind.push(Math.round(w * 10) / 10);
            out.windGust.push(Math.round(w * 1.35 * 10) / 10);
            out.windDir.push(levante ? 100 + Math.sin(i / 5) * 12 : 270 + Math.sin(i / 5) * 15);
            out.temperature.push(273.15 + 19 + Math.sin(((h - 9) / 24) * Math.PI * 2) * 4);
            out.waves.push(Math.round((0.4 + w / 25) * 10) / 10);
            out.wavesPeriod.push(5 + Math.round(w / 6));
            out.wavesPower.push(Math.round((w / 8) * 10) / 10);
            out.wavesDir.push(levante ? 95 : 265);
            out.swell1.push(0.4); out.swell1Period.push(8); out.swell1Dir.push(250);
            (out.precipAmount = out.precipAmount || []).push(day === 2 && h > 12 ? 1.2 : 0);
        }
        return out;
    };
    // like Windy: daily summary with predictability, and the place's sunrise/sunset
    const summaryOf = d => Array.from({ length: 8 }, (_, k) => ({ timestamp: d.ts[0] + k * 864e5, day: new Date(d.ts[0] + k * 864e5).getDate(), predictability: Math.max(20, 92 - k * 9) }));
    const getPointForecastData = async (model, { lat, lon }, include) => {
        await new Promise(r => setTimeout(r, 250 + Math.random() * 350));
        if (model === 'arome' && lat < 41) throw new Error('AROME covers France only');
        if (!['ecmwf', 'gfs', 'icon', 'iconEu', 'arome', 'mblue', 'ecmwfWaves', 'gfsWaves'].includes(model)) throw new Error(model + ' does not cover this place');
        const d = series(model.replace('Waves', ''), lat, lon);
        const sr = new Date(); sr.setHours(7, 40, 0, 0); const ss = new Date(); ss.setHours(19, 25, 0, 0);
        return { data: { data: d, header: { model }, ...(include?.summary ? { summary: summaryOf(d) } : {}), ...(include?.celestial ? { celestial: { sunriseTs: +sr, sunsetTs: +ss } } : {}) } };
    };
    // Windy's tide forecast (undocumented, Premium): the real answer's shape, 7 days from 00:00 UTC today,
    // hourly levels plus each high and low: { header: { copyright }, data: { hours, types, heights } }
    const getTideForecastUrl = ({ lat, lon }) => `mock://tides/${lat.toFixed(2)}/${lon.toFixed(2)}`;
    const http = { get: async url => {
        if (!url.startsWith('mock://tides')) throw new Error('offline');
        if (!store.get('subscription')) { const e = new Error('Unauthorized'); e.status = 401; throw e; }
        const day0 = Math.floor(Date.now() / 864e5) * 864e5, H = 3600e3, P = 12.4 * H;
        // a high at 2:18 local today, then a low or high every 6.2 hours (local midnight, like the old mock)
        const t0 = new Date(); t0.setHours(0, 0, 0, 0);
        const firstHigh = +t0 + 2.3 * H;
        const level = t => 0.95 + 0.65 * Math.cos(2 * Math.PI * (t - firstHigh) / P);
        const pts = [];
        for (let t = day0; t <= day0 + 7 * 864e5; t += H) pts.push({ t, type: null });
        for (let k = -6; k < 30; k++) { const t = firstHigh + k * P / 2; if (t > day0 && t < day0 + 7 * 864e5) pts.push({ t: Math.round(t), type: k % 2 ? 'Low' : 'High' }); }
        pts.sort((x, y) => x.t - y.t);
        const uniq = pts.filter((p, i) => i === 0 || p.t !== pts[i - 1].t);
        return { status: 200, data: {
            header: { copyright: 'Tidal data retrieved from www.worldtides.info (mock).' },
            data: { hours: uniq.map(p => p.t), types: uniq.map(p => p.type), heights: uniq.map(p => Math.round(level(p.t) * 1000) / 1000) },
        } };
    } };
    // Windy Premium: the mock user has it (store 'subscription'); try store.set('subscription', null)
    const subscription = { hasAny: () => !!store.get('subscription') };

    // ---- reverse geocoding ----
    const PLACES = [
        { name: 'Tarifa', lat: 36.013, lon: -5.604 }, { name: 'Valdevaqueros', lat: 36.068, lon: -5.697 },
        { name: 'Bolonia', lat: 36.089, lon: -5.772 }, { name: 'Los Lances', lat: 36.03, lon: -5.62, hidden: true },
        { name: 'Punta Paloma', lat: 36.065, lon: -5.72, hidden: true }, { name: 'Zahara de los Atunes', lat: 36.137, lon: -5.846 },
    ];
    const reverseName = {
        get: async ({ lat, lon }) => {
            const d = p => Math.hypot(p.lat - lat, (p.lon - lon) * 0.8);
            const best = PLACES.slice().sort((a, b) => d(a) - d(b))[0];
            return { lat, lon, name: d(best) < 0.06 ? best.name : 'Near ' + best.name, lang: 'en' };
        },
    };


    // ---- fake backend-neutral sync server (test-only; production sync is disabled) ----
    // It "verifies" Windy's login token like the real function does: token 'mock-token-<id>' belongs to user <id>.
    const CLOUD_KEY = 'spotlog-mock-cloud';
    const cdb = () => { try { return JSON.parse(localStorage.getItem(CLOUD_KEY) || '{}'); } catch { return {}; } };
    const cwrite = v => { try { localStorage.setItem(CLOUD_KEY, JSON.stringify(v)); } catch { /* ignore */ } };
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const verify = a => { if (!a || a.token !== 'mock-token-' + a.id) throw new Error('Could not confirm your Windy login'); return String(a.id); };
    window.__spotlogCloudMock = {
        async pull(a) { await wait(200); const id = verify(a); const r = (cdb().rows || {})[id]; return r ? { data: r.data, updatedAt: r.updatedAt, revision: r.revision || 0 } : null; },
        async push(a, data, expectedRevision) {
            await wait(200); const id = verify(a); const d = cdb(); d.rows = d.rows || {};
            const revision = d.rows[id]?.revision || 0;
            if (revision !== expectedRevision) { const err = new Error('Sync conflict'); err.status = 409; throw err; }
            d.rows[id] = { data, updatedAt: data.updatedAt || Date.now(), revision: revision + 1 };
            cwrite(d); return revision + 1;
        },
        async remove(a) { await wait(200); const id = verify(a); const d = cdb(); if (d.rows) delete d.rows[id]; cwrite(d); },
    };

    // ---- Windy's own closing ✕ (Windy draws it on every right-hand pane plugin) ----
    const addClosingX = () => {
        const pane = document.getElementById('pane');
        if (!pane || document.getElementById('w-closing-x')) return;
        const b = document.createElement('button');
        b.id = 'w-closing-x';
        b.className = 'w-closing-x';
        b.type = 'button';
        b.title = 'Windy’s own close button (stand-in)';
        b.setAttribute('aria-label', 'Close plugin');
        b.textContent = '✕';
        b.addEventListener('click', e => { e.stopPropagation(); console.log('[W] rqstClose (Windy closes the plugin)'); b.animate?.([{ transform: 'scale(.85)' }, { transform: 'scale(1)' }], 180); });
        pane.parentElement.appendChild(b);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addClosingX); else addClosingX();

    // like Windy: typing anywhere jumps into its search box, space plays the timeline
    document.addEventListener('keydown', e => {
        const t = e.target;
        if (e.key === ' ') { e.preventDefault(); console.log('[W] space: play timeline'); return; }
        if (e.key.length === 1 && !(t && t.id === 'mock-search')) {
            let box = document.getElementById('mock-search');
            if (!box) { box = document.createElement('input'); box.id = 'mock-search'; box.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(box); }
            box.focus();
        }
    });

    window.W = {
        broadcast: { emit: (t, ...a) => { console.log('[W.broadcast]', t, ...a); (listeners[t] || []).forEach(f => f(...a)); }, on: (t, f) => (listeners[t] = listeners[t] || []).push(f) },
        map: { map: leafletMap, markers: { pulsatingIcon: undefined }, centerMap },
        singleclick: { singleclick },
        store,
        reverseName,
        rootScope: { isMobileOrTablet: typeof matchMedia !== 'undefined' && matchMedia('(max-width: 760px)').matches },
        fetch: { getPointForecastData, getTideForecastUrl },
        http,
        subscription,
        // "Your current location": the mock phone stands where the map is centred
        geolocation: { getGPSlocation: async () => { const c = leafletMap.getCenter(); await new Promise(r => setTimeout(r, 150)); return { lat: c.lat, lon: c.lng, source: 'gps' }; } },
        __mock: { project, unproject, store, singleclick, PLACES, INIT, onMove: f => moveSubs.push(f), setView, view },
    };
})();
